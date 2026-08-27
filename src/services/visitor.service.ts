import { injectable } from "tsyringe";
import { Visitor } from "../models/Visitor";
import { Otp } from "../models/Otp";
import { QR } from "../models/QR";
import { BlockedVisitor } from "../models/BlockedVisitor";
import jwt from "jsonwebtoken";
import crypto from "crypto";

@injectable()
export class VisitorService {
    registerOrGetVisitor = async (name: string, mobile: string, lang?: string) => {
        let visitor = await Visitor.findOne({ mobile });
        if (!visitor) {
            visitor = await Visitor.create({ name, mobile, lang: lang || "en" });
        } else {
            visitor.name = name;
            visitor.lastScanAt = new Date();
            await visitor.save();
        }
        return visitor;
    };

    generateOTP = async (mobile: string) => {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const validUpto = new Date(Date.now() + 10 * 60 * 1000);
        
        const visitor = await Visitor.findOne({ mobile });
        if (!visitor) throw new Error("visitor_not_found");
        
        await Otp.findOneAndUpdate(
            { userId: visitor._id },
            { userId: visitor._id, otp, validUpto, triesLeft: 3 },
            { upsert: true }
        );
        
        return otp;
    };

    verifyOTP = async (mobile: string, otp: string) => {
        const visitor = await Visitor.findOne({ mobile });
        if (!visitor) throw new Error("visitor_not_found");
        
        const otpRecord = await Otp.findOne({ userId: visitor._id, otp });
        if (!otpRecord) throw new Error("invalid_otp");
        if (otpRecord.validUpto < new Date()) throw new Error("otp_expired");
        if (otpRecord.triesLeft <= 0) throw new Error("otp_tries_exceeded");

        await Otp.deleteOne({ userId: visitor._id });

        visitor.otpVerifiedAt = new Date();
        await visitor.save();

        // Generate JWT token for visitor
        // const jwtSecret = process.env.ACCESS_TOKEN_SECRET || 'mysafety-secret-key-2024';
        const token = jwt.sign(
            { 
                visitorId: visitor._id.toString(),
                userId: visitor._id.toString(), // For socket auth compatibility
                userType: "Visitor",
                mobile: visitor.mobile 
            },
            process.env.ACCESS_TOKEN_SECRET!,
            { expiresIn: "1d" }
        );

        return { ...visitor.toObject(), token };
    };

    shouldSkipOTP = async (mobile: string) => {
        const visitor = await Visitor.findOne({ mobile });
        if (!visitor || !visitor.otpVerifiedAt) return false;
        
        const hoursSinceVerification = (Date.now() - new Date(visitor.otpVerifiedAt).getTime()) / (1000 * 60 * 60);
        return hoursSinceVerification < 1;
    };

    generateTokenForVisitor = async (visitorId: string) => {
        const visitor = await Visitor.findById(visitorId);
        if (!visitor) throw new Error("visitor_not_found");

        const token = jwt.sign(
            { 
                visitorId: visitor._id.toString(),
                userId: visitor._id.toString(),
                userType: "Visitor",
                mobile: visitor.mobile 
            },
            process.env.ACCESS_TOKEN_SECRET!,
            { expiresIn: "1d" }
        );

        return { ...visitor.toObject(), token };
    };

    getQROwner = async (qrId: string) => {
        return await QR.findOne({ qrId }).select("ownerId").lean();
    };

    findVisitorByMobile = async (mobile: string) => {
        return await Visitor.findOne({ mobile }).lean();
    };

    checkIfBlocked = async (ownerId: string, phone: string) => {
        const blocked = await BlockedVisitor.exists({ ownerId, phone });
        return !!blocked;
    };
}
