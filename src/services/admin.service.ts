import { injectable } from "tsyringe";
import { User } from "../models/User";
import { Types } from "mongoose";
import logger from "../config/logger";

@injectable()
export class AdminService {
  getUserById = async (userId: string) => {
    try {
      const pipeline = [
        { $match: { _id: new Types.ObjectId(userId), role: "user" } },
        {
          $lookup: {
            from: "drivers",
            localField: "_id",
            foreignField: "userId",
            as: "drivers",
            pipeline: [{ $project: { name: 1, phone: 1, licenseNumber: 1 } }]
          }
        },
        {
          $lookup: {
            from: "familymembers",
            localField: "_id",
            foreignField: "userId",
            as: "familyMembers",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "memberId",
                  foreignField: "_id",
                  as: "memberDetails",
                  pipeline: [{ $project: { name: 1, phone: 1 } }]
                }
              },
              {
                $project: {
                  memberDetails: { $arrayElemAt: ["$memberDetails", 0] }
                }
              }
            ]
          }
        },
        {
          $project: {
            name: 1,
            phone: 1,
            email: 1,
            address: 1,
            lang: 1,
            isActive: 1,
            createdAt: 1,
            drivers: 1,
            familyMembers: "$familyMembers.memberDetails"
          }
        }
      ];

      const [user] = await User.aggregate(pipeline);
      if (!user) throw new Error("user_not_found");

      return user;
    } catch (err: any) {
      logger.error("getUserById Error:", err);
      throw new Error(err.message);
    }
  };

  getAllUsers = async (page: number, size: number, sortBy: string, sortType: string, search: string) => {
    try {
      const skip = (page - 1) * size;
      const sortOrder = sortType === 'asc' ? 1 : -1 as 1 | -1;
      
      const matchStage: any = { role: "user" };
      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const sortStage: any = {};
      sortStage[sortBy] = sortOrder;

      const pipeline: any[] = [
        { $match: matchStage },
        {
          $lookup: {
            from: "drivers",
            localField: "_id",
            foreignField: "userId",
            as: "drivers",
            pipeline: [{ $project: { name: 1, phone: 1, licenseNumber: 1 } }]
          }
        },
        {
          $lookup: {
            from: "familymembers",
            localField: "_id",
            foreignField: "userId",
            as: "familyMembers",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "memberId",
                  foreignField: "_id",
                  as: "memberDetails",
                  pipeline: [{ $project: { name: 1, phone: 1 } }]
                }
              },
              {
                $project: {
                  memberDetails: { $arrayElemAt: ["$memberDetails", 0] }
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "userId",
            as: "subscription",
            pipeline: [
              { $match: { status: "active" } },
              { $project: { plan: 1, status: 1, startDate: 1, endDate: 1 } }
            ]
          }
        },
        {
          $project: {
            name: 1,
            phone: 1,
            email: 1,
            isActive: 1,
            createdAt: 1,
            drivers: 1,
            familyMembers: "$familyMembers.memberDetails",
            subscription: { $arrayElemAt: ["$subscription", 0] }
          }
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: size }
      ];

      const [users, totalCount] = await Promise.all([
        User.aggregate(pipeline),
        User.countDocuments(matchStage)
      ]);

      return {
        users,
        pagination: {
          page,
          size,
          total: totalCount,
          totalPages: Math.ceil(totalCount / size)
        }
      };
    } catch (err) {
      logger.error("getAllUsers Error:", err);
      throw new Error("users_get_failed");
    }
  };

  updateUser = async (userId: string, updates: any) => {
    try {
      const allowedFields = ["name", "phone", "email", "address", "lang"];
      const updatePayload: any = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updatePayload[field] = updates[field];
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        updatePayload,
        { new: true, runValidators: true }
      ).lean();

      if (!user) throw new Error("user_not_found");

      return user;
    } catch (err: any) {
      logger.error("updateUser Error:", err);
      throw new Error(err.message);
    }
  };

  toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive },
        { new: true }
      ).select("_id name phone isActive").lean();

      if (!user) throw new Error("user_not_found");

      return user;
    } catch (err: any) {
      logger.error("toggleUserStatus Error:", err);
      throw new Error(err.message);
    }
  };
}