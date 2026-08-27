import { injectable } from "tsyringe";
import { House } from "../models/House";
import { PredefinedMessage } from "../models/PredefinedMessage";
import { FamilyMember } from "../models/FamilyMember";
import crypto from 'crypto';
import { QRService } from "./qr.service";
import { DoorBellVisitEvent } from "../models/DoorBellVisitEvent";
import { Subscription } from "../models/Subscription";
import { getFeatureLimit } from "../utils/featureMatrix";
import { FrozenMemberService } from "./frozen-member.service";
import { isUserInTrialPeriod } from "../utils/trialPeriod";
import logger from "../config/logger";

@injectable()
export class DoorbellService {
  qrService = new QRService();
  frozenMemberService = new FrozenMemberService();
  createHouse = async (userId: string, houseData: any, creationType: 'Temporary' | 'Full' = 'Temporary') => {
    try {
      const qrCode = crypto.randomBytes(16).toString('hex');

      const house = await House.create({
        userId,
        houseName: houseData.houseName,
        houseNumber: houseData.houseNumber,
        apartment: houseData.apartment,
        fullAddressUrl: houseData.fullAddressUrl,
        latitude: houseData.latitude,
        longitude: houseData.longitude,
        qrId: houseData.qrId
      });

      // Auto-generate temporary QR if not provided
      if (!houseData.qrId) {
        const qr = await this.qrService.generateTemporaryQR(userId, "Temporary", "DoorBell", house._id.toString(), creationType);
        house.qrId = qr._id;
      }
      await house.save();

      return {
        _id: house._id,
        houseName: house.houseName,
        fullAddressUrl: house.fullAddressUrl,
        apartment: house.apartment,
        longitude: house.longitude,
        latitude: house.latitude,
        qrCode: house.qrId
      };
    } catch (err: any) {
      logger.error("createHouse Error:", err);
      throw new Error(err.message);
    }
  };

  getHouses = async (userId: string) => {
    try {
      const result = await House.aggregate([
        {
          $match: {
            $or: [
              { userId: userId },
              {
                memberIds: {
                  $in: await FamilyMember.find({ memberId: userId }).distinct('_id')
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: "qrs",
            localField: "qrId",
            foreignField: "_id",
            as: "qrDetails"
          }
        },
        {
          $addFields: {
            role: {
              $cond: {
                if: { $eq: ["$userId", userId] },
                then: "owner",
                else: "member"
              }
            },
            qrCode: { $arrayElemAt: ["$qrDetails.qrId", 0] },
            redirectUrl: {
              $concat: [
                process.env.APP_BASE_URL || "",
                { $arrayElemAt: ["$qrDetails.qrId", 0] }
              ]
            },
            qrStatus: {
              isTemporary: { $arrayElemAt: ["$qrDetails.isTemporary", 0] },
              isFrozen: { $arrayElemAt: ["$qrDetails.isFrozen", 0] },
              expiresAt: { $arrayElemAt: ["$qrDetails.expiresAt", 0] },
              status: { $arrayElemAt: ["$qrDetails.status", 0] }
            }
          }
        },
        {
          $project: {
            houseName: 1,
            houseNumber: 1,
            fullAddressUrl: 1,
            apartment: 1,
            latitude: 1,
            longitude: 1,
            qrId: 1,
            qrCode: 1,
            redirectUrl: 1,
            qrStatus: 1,
            createdAt: 1,
            role: 1
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      return result;
    } catch (err) {
      logger.error("getHouses Error:", err);
      throw new Error("house_get_failed");
    }
  };

  updateHouse = async (houseId: string, userId: string, updates: any) => {
    try {
      const existingHouse = await House.findById(houseId).lean();
      if (!existingHouse) throw new Error("house_not_found");
      if (existingHouse.userId.toString() != userId) throw new Error("you_dont_have_permission_to_perform_this_operation");

      const house = await House.findByIdAndUpdate(
        houseId,
        updates,
        { new: true }
      ).select("houseName houseNumber fullAddressUrl qrCode apartment longitude latitude").lean();

      return house;
    } catch (err: any) {
      logger.error("updateHouse Error:", err);
      throw new Error(err.message);
    }
  };

  deleteHouse = async (houseId: string, userId: string) => {
    try {
      const existingHouse = await House.findById(houseId).lean();
      if (!existingHouse) throw new Error("house_not_found");
      if (existingHouse.userId.toString() != userId) throw new Error("you_dont_have_permission_to_perform_this_operation");

      await House.findByIdAndDelete(houseId);
      await PredefinedMessage.deleteMany({ houseId });

      return { deletedId: houseId };
    } catch (err: any) {
      logger.error("deleteHouse Error:", err);
      throw new Error(err.message);
    }
  };

  manageHouseMembers = async (houseId: string, userId: string, familyMemberIds: string[]) => {
    try {
      // Check if user has active trial period
      const inTrialPeriod = await isUserInTrialPeriod(userId, 'DoorBell');

      // If no trial, check feature limit
      if (!inTrialPeriod) {
        const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
        const userPlan = subscription?.plan || 'Free';
        const limit = await getFeatureLimit('DoorBell', userPlan, 'family_members');

        if (limit !== null && familyMemberIds.length > limit) {
          throw new Error(`family_member_limit_exceeded:${limit}`);
        }
      }

      // Update house with new member IDs
      const house = await House.findByIdAndUpdate(
        houseId,
        { memberIds: familyMemberIds },
        { new: true }
      ).populate({
        path: 'memberIds',
        populate: {
          path: 'memberId',
          select: '_id name phone'
        }
      }).lean();

      if (!house) throw new Error("house_not_found");

      const members = (house.memberIds as any[]).map(familyMember => {
        const memberData = familyMember?.memberId;
        return {
          _id: familyMember._id,
          memberDetails: {
            name: memberData?.name,
            phone: memberData?.phone
          }
        };
      });

      return { addedMembers: members, totalCount: members.length };
    } catch (err: any) {
      logger.error("manageHouseMembers Error:", err);
      throw new Error(err.message);
    }
  };

  getHouseMembers = async (houseId: string, userId: string) => {
    try {
      const house = await House.findById(houseId)
        .populate({
          path: 'memberIds',
          populate: {
            path: 'memberId',
            select: '-_id name phone email'
          }
        })
        .populate({
          path: 'frozenMemberIds',
          populate: {
            path: 'memberId',
            select: '-_id name phone email'
          }
        })
        .lean();

      if (!house) throw new Error("house_not_found");

      const activeMembers = (house.memberIds as any[]).map(familyMember => {
        const memberDetails = familyMember?.memberId;
        return {
          _id: familyMember._id,
          memberDetails: memberDetails,
          status: 'active'
        };
      });

      const frozenMembers = ((house as any).frozenMemberIds as any[] || []).map(familyMember => {
        const memberDetails = familyMember?.memberId;
        return {
          _id: familyMember._id,
          memberDetails: memberDetails,
          status: 'frozen'
        };
      });

      // Get all user's family members
      const allUserMembers = await FamilyMember.find({ userId })
        .populate('memberId', '-_id name phone email')
        .lean();

      // Filter out already assigned members (active + frozen)
      const assignedMemberIds = new Set([
        ...activeMembers.map(m => m._id.toString()),
        ...frozenMembers.map(m => m._id.toString())
      ]);

      const availableMembers = allUserMembers
        .filter(fm => !assignedMemberIds.has(fm._id.toString()))
        .map(familyMember => ({
          _id: familyMember._id,
          memberDetails: familyMember.memberId,
          status: 'available'
        }));

      return {
        activeMembers,
        frozenMembers,
        availableMembers,
        totalActive: activeMembers.length,
        totalFrozen: frozenMembers.length,
        totalAvailable: availableMembers.length
      };
    } catch (err) {
      logger.error("getHouseMembers Error:", err);
      throw new Error("house_members_get_failed");
    }
  };

  generateQRKit = async (houseId: string, userId: string) => {
    try {
      const house = await House.findOne({ _id: houseId, userId }).populate("qrId", "qrId").lean();
      if (!house) throw new Error("house_not_found");

      const qrData = house.qrId as any;
      const qrCode = qrData?.qrId || house.qrId;

      return {
        qrCode: qrCode,
        houseName: house.houseName,
        fullAddressUrl: house.fullAddressUrl,
        qrUrl: `${process.env.APP_BASE_URL}/api/user/scan/${qrCode}`
      };
    } catch (err: any) {
      logger.error("generateQRKit Error:", err);
      throw new Error(err.message);
    }
  };

  getVisits = async (userId: string) => {
    try {
      return await DoorBellVisitEvent.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .populate("houseId")
        .lean();
    } catch (err: any) {
      logger.error("getVisits Error:", err);
      throw new Error(err.message);
    }
  };

  reassignFrozenMembers = async (houseId: string, userId: string, memberIds: string[]) => {
    try {
      // return await this.frozenMemberService.reassignFrozenMembers(houseId, userId, memberIds);

      const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
      const userPlan = subscription?.plan || 'Free';

      if (userPlan === 'Free' && memberIds.length > 2) {
        throw new Error('free_users_can_reassign_max_2_members');
      }

      const house = await House.findById(houseId);
      if (!house) throw new Error('house_not_found');

      // Validate all memberIds exist in frozenMemberIds
      const invalidIds = memberIds.filter(id =>
        !(house as any).frozenMemberIds.some((fid: any) => fid.toString() === id)
      );
      if (invalidIds.length > 0) throw new Error('invalid_frozen_member_ids');

      // Move selected members from frozen to active
      (house as any).frozenMemberIds = (house as any).frozenMemberIds.filter(
        (id: any) => !memberIds.includes(id.toString())
      );
      house.memberIds = [...house.memberIds, ...memberIds as any];
      await house.save();

      return {
        reassignedCount: memberIds.length,
        totalActive: house.memberIds.length,
        totalFrozen: (house as any).frozenMemberIds.length
      };
    } catch (err: any) {
      logger.error("reassignFrozenMembers Error:", err);
      throw new Error(err.message);
    }
  };
}