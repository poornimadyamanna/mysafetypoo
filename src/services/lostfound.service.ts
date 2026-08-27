import { injectable } from "tsyringe";
import { LostFound } from "../models/LostFound";
import { LostFoundEvent } from "../models/LostFoundEvent";
import { QRService } from "./qr.service";
import mongoose from "mongoose";
import { getFeatureLimit } from "../utils/featureMatrix";
import { Subscription } from "../models/Subscription";
import { isUserInTrialPeriod } from "../utils/trialPeriod";
import { FamilyMember } from "../models/FamilyMember";
import logger from "../config/logger";

@injectable()
export class LostFoundService {
    constructor(private qrService: QRService) { }
    createItem = async (userId: string, itemData: any, creationType: 'Temporary' | 'Full' = 'Temporary') => {
        const item = await LostFound.create({ userId, ...itemData });

        // Auto-generate temporary QR if not provided
        if (!itemData.qrId) {
            // const qrService = new QRService();
            const qr = await this.qrService.generateTemporaryQR(userId, "Temporary", "LostFound", item._id.toString(), creationType);
            item.qrId = qr._id;
            await item.save();
        }

        return item;
    };

    getItems = async (userId: string) => {
        try {
            const result = await LostFound.aggregate([
                {
                    $match: {
                        $or: [
                            { userId: new mongoose.Types.ObjectId(userId) },
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
                        qrDetails: 0
                    }
                },
                { $sort: { createdAt: -1 } }
            ]);

            return result;
        } catch (err) {
            logger.error("getLostFoundItems Error:", err);
            throw new Error("lostfound_get_failed");
        }

        // return await LostFound.find({ userId }).sort({ createdAt: -1 }).lean();
    };

    updateItem = async (itemId: string, userId: string, updates: any) => {
        const item = await LostFound.findOne({ _id: itemId, userId });
        if (!item) throw new Error("item_not_found");
        Object.assign(item, updates);
        await item.save();
        return item;
    };

    deleteItem = async (itemId: string, userId: string) => {
        const item = await LostFound.findOneAndDelete({ _id: itemId, userId });
        if (!item) throw new Error("item_not_found");
        return { deletedId: itemId };
    };

    reportFound = async (qrId: any, lostFoundId: any, ownerId: any, scannerId: string, scannerType: string, location: any) => {
        const event = await LostFoundEvent.create({
            qrId,
            lostFoundId,
            ownerId,
            scannerId,
            scannerType,
            location
        });
        return event;
    };

    getEvents = async (userId: string) => {
        return await LostFoundEvent.find({ ownerId: userId }).sort({ createdAt: -1 }).populate("lostFoundId").lean();
    };

    updateEventStatus = async (eventId: string, userId: string, status: string) => {
        const event = await LostFoundEvent.findOne({ _id: eventId, ownerId: userId });
        if (!event) throw new Error("event_not_found");
        event.status = status as any;
        await event.save();
        return event;
    };



    manageHouseMembers = async (itemId: string, userId: string, familyMemberIds: string[]) => {
        try {
            // Check if user has active trial period
            const inTrialPeriod = await isUserInTrialPeriod(userId, 'LostFound');

            // If no trial, check feature limit
            if (!inTrialPeriod) {
                const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
                const userPlan = subscription?.plan || 'Free';
                const limit = await getFeatureLimit('LostFound', userPlan, 'family_members');

                if (limit !== null && familyMemberIds.length > limit) {
                    throw new Error(`family_member_limit_exceeded:${limit}`);
                }
            }

            // Update house with new member IDs
            const lostItem = await LostFound.findByIdAndUpdate(
                itemId,
                { memberIds: familyMemberIds },
                { new: true }
            ).populate({
                path: 'memberIds',
                populate: {
                    path: 'memberId',
                    select: '_id name phone'
                }
            }).lean();

            if (!lostItem) throw new Error("house_not_found");

            const members = (lostItem.memberIds as any[]).map(familyMember => {
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

    getHouseMembers = async (itemId: string, userId: string) => {
        try {
            const lostItem = await LostFound.findById(itemId)
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

            if (!lostItem) throw new Error("house_not_found");

            const activeMembers = (lostItem.memberIds as any[]).map(familyMember => {
                const memberDetails = familyMember?.memberId;
                return {
                    _id: familyMember._id,
                    memberDetails: memberDetails,
                    status: 'active'
                };
            });

            const frozenMembers = ((lostItem as any).frozenMemberIds as any[] || []).map(familyMember => {
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


    reassignFrozenMembers = async (itemId: string, userId: string, memberIds: string[]) => {
        try {
            // return await this.frozenMemberService.reassignFrozenMembers(itemId, userId, memberIds);

            const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
            const userPlan = subscription?.plan || 'Free';

            if (userPlan === 'Free' && memberIds.length > 2) {
                throw new Error('free_users_can_reassign_max_2_members');
            }

            const lostItem = await LostFound.findById(itemId);
            if (!lostItem) throw new Error('house_not_found');

            // Validate all memberIds exist in frozenMemberIds
            const invalidIds = memberIds.filter(id =>
                !(lostItem as any).frozenMemberIds.some((fid: any) => fid.toString() === id)
            );
            if (invalidIds.length > 0) throw new Error('invalid_frozen_member_ids');

            // Move selected members from frozen to active
            (lostItem as any).frozenMemberIds = (lostItem as any).frozenMemberIds.filter(
                (id: any) => !memberIds.includes(id.toString())
            );
            lostItem.memberIds = [...lostItem.memberIds, ...memberIds as any];
            await lostItem.save();

            return {
                reassignedCount: memberIds.length,
                totalActive: lostItem.memberIds.length,
                totalFrozen: (lostItem as any).frozenMemberIds.length
            };
        } catch (err: any) {
            logger.error("reassignFrozenMembers Error:", err);
            throw new Error(err.message);
        }
    };
}
