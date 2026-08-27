import { injectable } from "tsyringe";
import { User } from "../models/User";
import { Otp } from "../models/Otp";
import { Subscription } from "../models/Subscription";
import jwt from "jsonwebtoken";
import { generateUserId } from "../utils/generateUserId";
import { SessionToken } from "../models/SessionToken";
import admin from "../config/firebase";
import { MessageTemplate } from "../models/MessageTemplate";
import axios from "axios";
import { SMSService } from "./sms.service";
import logger from "../config/logger";

interface JWTPayload {
  id: string;
  phone: string;
  email: string;
  role: string;
  userType: string,
}

// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ;
// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ;

// if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
//   // amazonq-ignore-next-line
//   throw new Error("Server configuration error");
// }
// amazonq-ignore-next-line
// const ACCESS_TOKEN_EXPIRY = "15m";
const ACCESS_TOKEN_EXPIRY = "1d";
const REFRESH_TOKEN_EXPIRY = "7d";

@injectable()
export class AuthService {
  private generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();
  constructor(private smsService: SMSService) { }

  private generateTokensAndSession = async (user: any, ip: string, isRefresh: boolean = false) => {
    const payload: JWTPayload = { id: user._id.toString(), phone: user.phone, email: user.email || '', role: user.role || 'user', userType: user.role == 'user' ? "User" : "Admin", };
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });

    const updateData: any = {
      accessToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      deviceInfo: "unknown",
      ip,
    };

    if (!isRefresh) {
      const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRY });
      updateData.refreshToken = refreshToken;
    }

    await SessionToken.findOneAndUpdate(
      { userId: user._id },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return {
      token: accessToken,
      user: {
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        userId: user.userId,
        avatarUrl: user.avatarUrl,
        isExisting: user.isExisting,
        role: user.role || 'user'
      },
    };
  };

  sendOtp = async (phone: string) => {
    if (!phone) throw new Error("Phone number is required");

    // Step 1: Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      // if (type == 'signup') {
      const userId = await generateUserId();
      user = await new User({ name: phone, phone, userId }).save();

      // Create Free subscription for new user
      await Subscription.create({
        userId: user._id,
        plan: 'Free',
        status: 'active',
        startDate: new Date()
      });
      // } else {
      // throw new Error("Please register before login!")
      // }
    }

    const now = new Date();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const validUpto = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    const otpCode = this.generateOtp();

    // Step 2: Find existing OTP document
    let existingOtp = await Otp.findOne({ userId: user._id });

    if (existingOtp) {
      // Check if created within last 1 hour
      if (existingOtp.updatedAt >= oneHourAgo) {
        if (existingOtp.triesLeft <= 0) {
          // const templateId = await MessageTemplate.findOne({ msgType: 'max_otp', isActive: true }).select('templateId').lean();
          // if (!templateId) throw new Error("No template found");
          // this.smsService.sendMaxOtpSMS(templateId.templateId, phone)
          throw new Error("You have reached the OTP limit. Please try again after 1 hour.");
        }
      }
      else {
        existingOtp.triesLeft = 3;
      }

      // Replace with new OTP and reset triesLeft
      existingOtp.otp = otpCode;
      existingOtp.validUpto = validUpto;
      existingOtp.triesLeft -= 1; // Already used 1 (this request)
      await existingOtp.save();
    } else {
      // First time sending OTP for user
      await new Otp({
        userId: user._id,
        otp: otpCode,
        validUpto,
        createdAt: now,
        triesLeft: 2 // Already using one attempt now
      }).save();
    }
    // const templateId = await MessageTemplate.findOne({ msgType: 'otp', isActive: true }).select('templateId').lean();
    // if (!templateId) throw new Error("No template found");
    await this.smsService.sendOtpSMS(user.name, phone, otpCode).catch(err => {
      logger.error('SMS send failed, but OTP generated:', err.message);
    });
    // logger.log('templateId----------', templateId);

    // logger.log(`OTP for ${phone} is ${otpCode}`);

    return { phone };
  };



  verifyOtpAndLogin = async (phone: string, otp: string, ip: string) => {
    if (!phone || !otp) throw new Error("Phone and OTP are required");

    const user = await User.findOne({ phone });
    if (!user) throw new Error("User not found");

    const otpEntry = await Otp.findOne({ userId: user._id }).sort({ validUpto: -1 });
    if (!otpEntry) throw new Error("OTP not found");
    if (otpEntry.otp !== otp) throw new Error("Invalid OTP");
    if (otpEntry.validUpto < new Date()) throw new Error("OTP expired");

    // if (otp != '1234') throw new Error("Invalid OTP");

    await Otp.deleteMany({ userId: user._id });

    return this.generateTokensAndSession(user, ip);
  };


  refreshToken = async (accessTokenFromClient: string, ip: string) => {
    if (!accessTokenFromClient) {
      throw new Error("Unauthorized. Token not found.");
    }

    // Find session using access token and populate the user from `userId`
    const session = await SessionToken.findOne({ accessToken: accessTokenFromClient }).populate("userId");
    // logger.log(session);

    if (!session || !session.userId) {
      throw new Error("Invalid session or user not found.");
    }

    const user: any = session.userId; // This is populated User object
    const userRefreshToken = session.refreshToken;
    if (!userRefreshToken) {
      throw new Error("No refresh token found. Please login again.");
    }

    try {
      // Verify the refresh token
      jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_SECRET!) as JWTPayload;
      // amazonq-ignore-next-line

      const result = await this.generateTokensAndSession(user, ip, true);
      // amazonq-ignore-next-line
      return { token: result.token };
    } catch (err) {
      throw new Error("Session expired. Please login again.");
    }
  };


  logout = async (userId: string) => {
    const session = await SessionToken.findOne({ userId: userId });
    if (!session) throw new Error("Invalid session");

    session.accessToken = "";
    session.refreshToken = "";
    await session.save();
  };

  adminLogin = async (idToken: string, ip: string) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Authentication failed");
    }

    const result = await this.generateTokensAndSession(user, ip);
    return {
      token: result.token,
      admin: result.user
    };
  }



  googleSSO = async (idToken: string, ip: string) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    let user = await User.findOne({ email });

    if (!user) {
      const newUserId = await generateUserId();
      user = new User({
        userId: newUserId,
        name: name || 'No Name',
        // amazonq-ignore-next-line
        phone: `google-${uid}`,
        email,
        displayName: name || '',
        avatarUrl: picture || `https://api.multiavatar.com/${name || 'User'}.svg`,
        emailVerified: true
      });
      await user.save();

      // Create Free subscription for new Google SSO user
      const existingSubscription = await Subscription.findOne({ userId: user._id });
      if (!existingSubscription) {
        await Subscription.create({
          userId: user._id,
          plan: 'Free',
          status: 'active',
          startDate: new Date()
        });
      }
    }

    return this.generateTokensAndSession(user, ip);
  }

  appleSSO = async (idToken: string, ip: string) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    let user = await User.findOne({ email });

    if (!user) {
      const newUserId = await generateUserId();
      user = new User({
        userId: newUserId,
        name: name || 'Apple User',
        phone: `apple-${uid}`,
        email: email || `${uid}@privaterelay.appleid.com`,
        displayName: name || 'Apple User',
        avatarUrl: `https://api.multiavatar.com/${uid}.svg`,
        emailVerified: true
      });
      await user.save();

      const existingSubscription = await Subscription.findOne({ userId: user._id });
      if (!existingSubscription) {
        await Subscription.create({
          userId: user._id,
          plan: 'Free',
          status: 'active',
          startDate: new Date()
        });
      }
    }

    return this.generateTokensAndSession(user, ip);
  }
}