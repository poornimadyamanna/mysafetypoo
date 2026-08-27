import { injectable } from "tsyringe";
import { QR } from "../models/QR";
import { Vehicle } from "../models/Vehicle";
import { SmartCard } from "../models/SmartCard";
import { LostFound } from "../models/LostFound";
import { House } from "../models/House";
import crypto from "crypto";
import { scheduleQRExpiry } from "../queues/qr-expiry.queue";

@injectable()
export class QRService {
    generateQRBatch = async (qrType: string, moduleType: string, count: number, batchInfo?: string) => {
        const qrs = [];
        for (let i = 0; i < count; i++) {
            const qrId = crypto.randomBytes(16).toString("hex");
            qrs.push({ qrId, qrType, moduleType, status: "CREATED", batchInfo });
        }
        await QR.insertMany(qrs);
        return {
            status: "CREATED",
            count: count,
            qrType: qrType,
            // qrIds: createdQRs.map(qr => qr._id.toString())
        };
    };

    getQRInventory = async (filters: any) => {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = filters;

        const matchStage: any = {
            batchInfo: { $ne: null, $exists: true }
        };
        if (search) {
            matchStage.batchInfo = { $regex: search, $options: 'i' };
        }

        const skip = (page - 1) * limit;
        const sortDir: 1 | -1 = sortOrder === 'asc' ? 1 : -1;
        const sortStage: any = {};
        sortStage[sortBy] = sortDir;

        // Count total batches
        const countPipeline: any[] = [
            { $match: matchStage },
            { $group: { _id: "$batchInfo" } },
            { $count: "total" }
        ];

        // Get paginated data
        const dataPipeline: any[] = [
            { $match: matchStage },
            {
                $group: {
                    _id: "$batchInfo",
                    batchInfo: { $first: "$batchInfo" },
                    createdAt: { $first: "$createdAt" },
                    Vehicle: {
                        $sum: {
                            $cond: [{ $eq: ["$moduleType", "Vehicle"] }, 1, 0]
                        }
                    },
                    DoorBell: {
                        $sum: {
                            $cond: [{ $eq: ["$moduleType", "DoorBell"] }, 1, 0]
                        }
                    },
                    SmartCard: {
                        $sum: {
                            $cond: [{ $eq: ["$moduleType", "SmartCard"] }, 1, 0]
                        }
                    },
                    LostFound: {
                        $sum: {
                            $cond: [{ $eq: ["$moduleType", "LostFound"] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: sortStage },
            { $skip: skip },
            { $limit: Number(limit) }
        ];

        const [countResult, data] = await Promise.all([
            QR.aggregate(countPipeline),
            QR.aggregate(dataPipeline)
        ]);

        const total = countResult[0]?.total || 0;

        const formattedData = data.map((batch: any) => {
            return {
                batchInfo: batch.batchInfo,
                createdAt: batch.createdAt,
                moduleCounts: {
                    Vehicle: batch.Vehicle || 0,
                    DoorBell: batch.DoorBell || 0,
                    SmartCard: batch.SmartCard || 0,
                    LostFound: batch.LostFound || 0
                }
            };
        });

        return {
            data: formattedData,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    };
    getQRInventoryByBatch = async (filters: any) => {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, status, moduleType, batchInfo } = filters;

        const query: any = {};
        if (batchInfo) query.batchInfo = batchInfo;
        if (status) query.status = status;
        if (moduleType) query.moduleType = moduleType;

        if (search) {
            query.qrId = { $regex: `^${search}`, $options: 'i' };
        }

        const skip = (page - 1) * limit;
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const data = await QR.find(query)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            // .select('qrId qrType status ownerId isTemporary planAtActivation createdAt')
            .lean();

        const total = await QR.countDocuments(query);

        return {
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    };
    getInventoryCounts = async () => {
        const [totalQRs, totalBatches, totalTemporaryQRs, totalActiveQRs, totalUnusedQRs] = await Promise.all([
            QR.countDocuments({}),
            QR.distinct("batchInfo", { batchInfo: { $ne: null, $exists: true } }).then(batches => batches.length),
            // QR.distinct("batchInfo", { batchInfo: { $eq: null, $exists: false } }).then(batches => batches.length),
            QR.countDocuments({ batchInfo: null }),
            QR.countDocuments({ status: "ACTIVE" }),
            QR.countDocuments({ status: "CREATED" })
        ]);

        return {
            totalQRs,
            totalBatches,
            totalTemporaryQRs,
            totalActiveQRs,
            totalUnusedQRs
        };
    };

    generateTemporaryQR = async (userId: string, qrType: string, moduleType: string, moduleProfileId: string, creationType: 'Temporary' | 'Full' = 'Temporary') => {
        const qrId = crypto.randomBytes(16).toString("hex");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

        const qr = await QR.create({
            qrId,
            qrType,
            status: "ACTIVE",
            ownerId: userId,
            moduleType,
            moduleProfileId,
            assignedAt: now,
            planAtActivation: "Free",
            isTemporary: true,
            expiresAt,
            isFrozen: false
        });

        const models: any = { Vehicle, DoorBell: House, SmartCard, LostFound };
        if (models[moduleType]) {
            await models[moduleType].findByIdAndUpdate(moduleProfileId, { qrId: qr._id });
        }

        // Schedule expiry job
        if (creationType != 'Full') {
            await scheduleQRExpiry(qr._id.toString(), expiresAt);
        }

        return qr;
    };

    assignQR = async (qrId: string, userId: string, moduleType: string, moduleProfileId: string, plan: string) => {
        const qr = await QR.findOne({ qrId });
        if (!qr) throw new Error("qr_not_found_or_already_assigned");

        // Validate QR ownership and status for user activation
        if (qr.ownerId && qr.ownerId.toString() !== userId) {
            throw new Error("qr_not_owned_by_user");
        }
        if (qr.status !== "DELIVERED") {
            //  && qr.status !== "ORDERED" && qr.status !== "CREATED"
            throw new Error("qr_not_ready_for_activation");
        }

        // Check if module already has a temporary QR and delete it
        const models: any = { Vehicle, DoorBell: House, SmartCard, LostFound };
        if (models[moduleType]) {
            const existingProfile = await models[moduleType].findById(moduleProfileId);
            if (existingProfile?.qrId) {
                const oldQR = await QR.findById(existingProfile.qrId);
                if (oldQR?.isTemporary) {
                    await QR.findByIdAndDelete(existingProfile.qrId);
                }
            }
        }

        qr.status = "ACTIVE";
        qr.ownerId = userId as any;
        qr.moduleType = moduleType as any;
        qr.moduleProfileId = moduleProfileId as any;
        qr.assignedAt = new Date();
        qr.planAtActivation = plan as any;
        qr.isTemporary = false;

        await qr.save();

        // Update module profile with new QR reference
        if (models[moduleType]) {
            await models[moduleType].findByIdAndUpdate(moduleProfileId, { qrId: qr._id });
        }

        // Auto-unfreeze frozen members if Premium and DoorBell module
        if (moduleType === 'DoorBell' && plan === 'Premium') {
            const house = await House.findById(moduleProfileId);
            if (house && (house as any).frozenMemberIds?.length > 0) {
                house.memberIds = [...house.memberIds, ...(house as any).frozenMemberIds];
                (house as any).frozenMemberIds = [];
                await house.save();
            }
        }

        return qr;
    };

    // activatePhysicalQR = async (qrCode: string, userId: string, moduleType: string, moduleProfileId: string) => {
    //     // Find physical QR owned by user (from order)
    //     const qr = await QR.findOne({ qrId: qrCode, ownerId: userId, qrType: "Physical" });
    //     if (!qr) throw new Error("qr_not_found_or_not_owned");
    //     if (qr.status === "ACTIVE") throw new Error("qr_already_activated");
    //     if (qr.status !== "DELIVERED" && qr.status !== "ORDERED") throw new Error("qr_not_ready_for_activation");

    //     // Validate module profile ownership
    //     const models: any = { Vehicle, DoorBell: House, SmartCard, LostFound };
    //     if (!models[moduleType]) throw new Error("invalid_module_type");

    //     const profile = await models[moduleType].findById(moduleProfileId);
    //     if (!profile) throw new Error("profile_not_found");
    //     if (profile.userId.toString() !== userId) throw new Error("unauthorized_profile_access");

    //     // Replace temporary QR if exists
    //     if (profile.qrId) {
    //         const oldQR = await QR.findById(profile.qrId);
    //         if (oldQR?.isTemporary) {
    //             await QR.findByIdAndDelete(profile.qrId);
    //         } else if (oldQR && oldQR.status === "ACTIVE") {
    //             throw new Error("profile_already_has_active_physical_qr");
    //         }
    //     }

    //     // Activate physical QR
    //     qr.status = "ACTIVE";
    //     qr.moduleType = moduleType as any;
    //     qr.moduleProfileId = moduleProfileId as any;
    //     qr.assignedAt = new Date();
    //     qr.isTemporary = false;
    //     await qr.save();

    //     // Update profile with new QR
    //     await models[moduleType].findByIdAndUpdate(moduleProfileId, { qrId: qr._id });

    //     // Auto-reassign frozen members if Premium
    //     if (moduleType === 'DoorBell') {
    //         const house = await House.findById(moduleProfileId);
    //         if (house && (house as any).frozenMemberIds?.length > 0) {
    //             const subscription = await import('../models/Subscription').then(m => m.Subscription);
    //             const userSub = await subscription.findOne({ userId, status: 'active' });

    //             if (userSub?.plan === 'Premium') {
    //                 // Reassign frozen members
    //                 house.memberIds = [...house.memberIds, ...(house as any).frozenMemberIds];
    //                 (house as any).frozenMemberIds = [];
    //                 await house.save();
    //             }
    //         }
    //     }

    //     return qr;
    // };

    getUserPurchasedQRs = async (userId: string, filters?: { status?: string; moduleType?: string }) => {
        const query: any = { ownerId: userId, qrType: "Physical" };
        if (filters?.status) query.status = filters.status;
        if (filters?.moduleType) query.moduleType = filters.moduleType;

        return await QR.find(query)
            .sort({ createdAt: -1 })
            .select('qrId qrType moduleType status assignedAt createdAt')
            .lean();
    };

    suspendQR = async (qrId: string, userId: string) => {
        const qr = await QR.findOne({ qrId, ownerId: userId });
        if (!qr) throw new Error("qr_not_found");
        qr.status = "SUSPENDED";
        await qr.save();
        return qr;
    };

    reactivateQR = async (qrId: string, userId: string) => {
        const qr = await QR.findOne({ qrId, ownerId: userId });
        if (!qr) throw new Error("qr_not_found");
        qr.status = "ACTIVE";
        await qr.save();
        return qr;
    };

    getOwnerQRs = async (userId: string) => {
        return await QR.find({ ownerId: userId }).sort({ createdAt: -1 }).lean();
    };

    resolveQR = async (qrId: string, scannerLat?: number, scannerLng?: number) => {
        const qr = await QR.findOne({ qrId }).populate("ownerId");
        if (!qr) throw new Error("qr_not_found");

        // Check if temporary QR is expired
        if (qr.isTemporary && qr.expiresAt && new Date() > qr.expiresAt) {
            if (!qr.isFrozen) {
                qr.isFrozen = true;
                qr.status = "EXPIRED";
                await qr.save();
            }
            throw new Error("qr_expired_purchase_required");
        }

        if (qr.isFrozen) throw new Error("qr_frozen");
        if (qr.status !== "ACTIVE" && qr.status !== "DELIVERED") throw new Error("qr_inactive");

        // Track scan
        qr.lastScannedAt = new Date();
        qr.scanCount = (qr.scanCount || 0) + 1;
        await qr.save();

        const qrData = qr.toObject();

        let profile = null;
        const models: any = { Vehicle, DoorBell: House, SmartCard, LostFound };
        if (qrData.moduleType && models[qrData.moduleType]) {
            profile = await models[qrData.moduleType].findById(qrData.moduleProfileId).lean();
        }

        // Validate location for DoorBell scans
        if (qrData.moduleType === "DoorBell" && scannerLat && scannerLng && profile) {
            const houseLat = profile.latitude;
            const houseLng = profile.longitude;
            
            if (houseLat && houseLng) {
                const distance = this.calculateDistance(scannerLat, scannerLng, houseLat, houseLng);
                if (distance > 10) {
                    throw new Error("scanner_too_far_from_location");
                }
            }
        }

        return { qr: qrData, profile };
    };

    // Haversine formula to calculate distance between two coordinates in meters
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }
}
