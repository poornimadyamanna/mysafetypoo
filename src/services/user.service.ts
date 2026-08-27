import { injectable } from "tsyringe";
import { User } from "../models/User";
import { sendMail } from "../utils/mailer";
import { generateVerificationEmailTemplate } from "../utils/emailTemplates";
import crypto from 'node:crypto';
import { FamilyMember } from "../models/FamilyMember";
import { Driver } from "../models/Driver";
import logger from "../config/logger";

const MS_24_HOURS = 24 * 60 * 60 * 1000;

@injectable()
export class UserService {
  getUserProfile = async (userId: string) => {
    const user = await User.findById(userId).select("-_id").lean();
    if (!user) throw new Error("user_not_found");
    return user;
  };

  updateUserProfile = async (userId: string, updates: any) => {
    const allowedFields = ["name", "address", "phone", "lang", "avatarUrl", "email"];
    const user = await User.findById(userId);
    if (!user) throw new Error("user_not_found");

    const updatePayload: any = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === "phone" && updates.phone !== user.phone) {
          const existing = await User.findOne({ phone: updates.phone });
          if (existing && existing._id.toString() !== user._id.toString()) {
            throw new Error("phone_already_in_use");
          }
          updatePayload.phone = updates.phone;
        } else {
          updatePayload[field] = updates[field];
        }
      }
    }

    updatePayload["isExisting"] = true;

    const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, {
      new: true,
      runValidators: true,
    }).select("-_id");

    if (!updatedUser) throw new Error("user_update_failed");
    return updatedUser;
  };

  addMember = async (userId: string, phone: string) => {

    try {
      const memberExist = await User.findOne({ phone: phone }).select("_id name phone").lean();
      if (!memberExist) throw new Error("member_not_found");
      if (memberExist._id.toString() == userId) throw new Error("cannot_add_self_as_member");

      const member = await FamilyMember.create({ userId, memberId: memberExist._id });
      if (!member) throw new Error("member_add_failed");

      return {
        _id: member._id,
        memberDetails: { name: memberExist.name, phone: memberExist.phone }
      };
    } catch (err: any) {
      logger.error("addMember Error:", err);
      throw new Error(err.message);
    }
  };
  getMember = async (userId: string) => {

    try {
      const members = await FamilyMember.aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: "users",
            localField: "memberId",
            foreignField: "_id",
            as: "memberDetails",
            pipeline: [{ $project: { _id: 0, name: 1, phone: 1 } }]
          }
        },
        {
          $project: {
            _id: 1,
            memberDetails: { $arrayElemAt: ["$memberDetails", 0] }
          }
        }
      ]);

      return members;
    } catch (err) {
      logger.error("getMember Error:", err);
      throw new Error("member_get_failed");
    }
  };
  updateMember = async (userId: string, updates: any) => {

    try {
      const memberExist = await User.findOne({ phone: updates.phone }).select("_id name phone").lean();
      if (!memberExist) throw new Error("member_not_found");
      if (memberExist._id.toString() == userId) throw new Error("cannot_add_self_as_member");

      updates.memberId = memberExist._id;

      const member = await FamilyMember.findByIdAndUpdate(updates.id, updates, { new: true }).lean();
      if (!member) throw new Error("member_not_found");

      const memberDetails = await User.findById(member.memberId).select("_id name phone").lean();

      return {
        _id: member._id,
        memberDetails: { name: memberDetails?.name, phone: memberDetails?.phone }
      };
    } catch (err: any) {
      logger.error("updateMember Error:", err);
      throw new Error(err.message);
    }
  };
  deleteMember = async (id: string) => {

    try {
      const member = await FamilyMember.findByIdAndDelete(id).lean();
      if (!member) throw new Error("member_not_found");

      return { deletedId: id };
    } catch (err) {
      logger.error("deleteMember Error:", err);
      throw new Error("member_delete_failed");
    }
  };





  addDriver = async (userId: string, updates: any) => {

    try {
      const driver = await Driver.create({
        userId,
        name: updates.name,
        phone: updates.phone,
        vehicleId: updates.vehicleId,
        licenseNumber: updates.licenseNumber,
        licenseDocument: updates.licenseDocument
      });
      if (!driver) throw new Error("driver_add_failed");

      return {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleId: driver.vehicleId,
        licenseNumber: driver.licenseNumber,
        licenseDocument: driver.licenseDocument
      };
    } catch (err: any) {
      logger.error("addDriver Error:", err);
      throw new Error(err.message);
    }
  };
  getDrivers = async (userId: string) => {

    try {
      const drivers = await Driver.aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: "vehicles",
            localField: "vehicleId",
            foreignField: "_id",
            as: "vehicleDetails",
            pipeline: [{ $project: { _id: 1, name: 1, model: 1, plateNumber: 1 } }]
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            phone: 1,
            vehicleDetails: { $arrayElemAt: ["$vehicleDetails", 0] },
            licenseNumber: 1,
            licenseDocument: 1
          }
        }
      ]);

      return drivers;
    } catch (err) {
      logger.error("getDrivers Error:", err);
      throw new Error("driver_get_failed");
    }
  };
  updateDriver = async (updates: any) => {

    try {
      const driver = await Driver.findByIdAndUpdate(updates.id, updates, { new: true }).lean();
      if (!driver) throw new Error("driver_not_found");

      return {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleId: driver.vehicleId,
        licenseNumber: driver.licenseNumber,
        licenseDocument: driver.licenseDocument
      };
    } catch (err: any) {
      logger.error("updateDriver Error:", err);
      throw new Error("driver_update_failed");
    }
  };
  deleteDriver = async (id: string) => {

    try {
      const driver = await Driver.findByIdAndDelete(id).lean();
      if (!driver) throw new Error("driver_not_found");

      return { deletedId: id };
    } catch (err) {
      logger.error("deleteDriver Error:", err);
      throw new Error("driver_delete_failed");
    }
  };

  updateUserEmail = async (userId: string, updates: any, lang: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("user_not_found");

    const { email } = updates;
    if (!email || email === user.email) throw new Error("invalid_or_same_email");

    const existing = await User.findOne({ email });
    if (existing) throw new Error("email_already_in_use");

    const token = crypto.randomBytes(32).toString("hex");

    user.pendingEmail = email;
    user.emailVerificationToken = token;

    await user.save();

    const link = `${process.env.APP_EMAIL_BASEURL}/api/user/verify-email?token=${token}`;
    const html = generateVerificationEmailTemplate(link);

    await sendMail(email, "Verify your email address", html);

    return { message: "verification_email_sent", pendingEmail: email };
  };

  verifyEmailByToken = async (token: string) => {
    if (!token) throw new Error("invalid_token");

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user || !user.pendingEmail) throw new Error("invalid_or_expired_token");

    user.email = user.pendingEmail;
    user.emailVerified = true;
    user.pendingEmail = undefined;
    user.emailVerificationToken = undefined;

    await user.save();

    return { message: "email_verified_successfully", email: user.email };
  };

}
