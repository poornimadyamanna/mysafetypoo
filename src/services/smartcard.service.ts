import { injectable } from "tsyringe";
import { SmartCard } from "../models/SmartCard";
import { SmartCardViewEvent } from "../models/SmartCardViewEvent";
import { QRService } from "./qr.service";
import mongoose from "mongoose";
import logger from "../config/logger";

@injectable()
export class SmartCardService {
    constructor(private qrService: QRService) { }
    createSmartCard = async (userId: string, cardData: any, creationType: 'Temporary' | 'Full' = 'Temporary') => {
        const card = await SmartCard.create({ userId, ...cardData });

        // Auto-generate temporary QR if not provided
        if (!cardData.qrId) {

            const qr = await this.qrService.generateTemporaryQR(userId, "Temporary", "SmartCard", card._id.toString(), creationType);
            card.qrId = qr._id;
            await card.save();
        }

        return card;
    };

    getSmartCards = async (userId: string) => {
        try {
            const result = await SmartCard.aggregate([
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
        // return await SmartCard.find({ userId }).sort({ createdAt: -1 }).lean();
    };

    updateSmartCard = async (cardId: string, userId: string, updates: any) => {
        const card = await SmartCard.findByIdAndUpdate(cardId, updates, { new: true }).lean();
        if (!card) throw new Error("smartcard_not_found");
        // Object.assign(card, updates);
        // await card.save();
        return card;
    };
    toggleActiveLink = async (cardId: string, userId: string, type: string, isActive: boolean) => {
        const card = await SmartCard.findOneAndUpdate(
            {
                _id: cardId,
                userId,
                "activeSocialLinks.type": type
            },
            {
                $set: { "activeSocialLinks.$.isActive": isActive }
            },
            { new: true }
        );

        if (!card) throw new Error("smartcard_or_link_not_found");

        return card;
    };

    deleteSmartCard = async (cardId: string, userId: string) => {
        const card = await SmartCard.findOneAndDelete({ _id: cardId, userId });
        if (!card) throw new Error("smartcard_not_found");
        return { deletedId: cardId };
    };

    logView = async (qrId: any, smartCardId: any, ownerId: any, scannerId: string, scannerType: string, action: string, location?: any) => {
        const event = await SmartCardViewEvent.create({
            qrId,
            smartCardId,
            ownerId,
            scannerId,
            scannerType,
            action,
            location
        });
        return event;
    };

    getAnalytics = async (userId: string, smartCardId: string) => {
        const totalViews = await SmartCardViewEvent.countDocuments({ ownerId: userId, smartCardId });
        const recentViews = await SmartCardViewEvent.find({ ownerId: userId, smartCardId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        return { totalViews, recentViews };
    };
}
