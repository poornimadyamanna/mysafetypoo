import { injectable } from "tsyringe";
import { User } from "../models/User";
import { FamilyMember } from "../models/FamilyMember";
import logger from "../config/logger";


@injectable()
export class MemberService {

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
      if (err.code === 11000) throw new Error("member_already_exists");
      throw new Error(err.message || "member_add_failed");
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
          $lookup: {
            from: "houses",
            localField: "_id",
            foreignField: "memberIds",
            as: "assignedHouses",
            pipeline: [{ $project: { houseName: 1, houseNumber: 1, apartment: 1 } }]
          }
        },
        {
          $project: {
            _id: 1,
            memberDetails: { $arrayElemAt: ["$memberDetails", 0] },
            assignedHouses: 1
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

}
