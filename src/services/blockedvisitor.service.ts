import { injectable } from "tsyringe";
import { BlockedVisitor } from "../models/BlockedVisitor";
import { Visitor } from "../models/Visitor";

@injectable()
export class BlockedVisitorService {
    blockVisitorByPhone = async (ownerId: string, phone: string, reason?: string) => {
        const blocked = await BlockedVisitor.findOneAndUpdate(
            { ownerId, phone },
            { ownerId, phone, reason, blockedAt: new Date() },
            { upsert: true, new: true }
        ).lean();

        return blocked;
    };

    unblockVisitorByPhone = async (ownerId: string, phone: string) => {
        const result = await BlockedVisitor.findOneAndDelete({ ownerId, phone }).lean();
        if (!result) throw new Error("visitor_not_blocked");
        return { phone };
    };

    isVisitorBlocked = async (ownerId: string, visitorId: string): Promise<boolean> => {
        const visitor = await Visitor.findById(visitorId).select('mobile').lean();
        if (!visitor) return false;
        const blocked = await BlockedVisitor.exists({ ownerId, phone: visitor.mobile });
        return !!blocked;
    };

    isVisitorBlockedByPhone = async (ownerId: string, phone: string): Promise<boolean> => {
        const blocked = await BlockedVisitor.exists({ ownerId, phone });
        return !!blocked;
    };

    getBlockedVisitors = async (ownerId: string) => {
        const blocked = await BlockedVisitor.find({ ownerId })
            .sort({ blockedAt: -1 })
            .lean();

        return blocked;
    };
}
