import { Response } from "express";
import { container } from "tsyringe";
import { QRService } from "../services/qr.service";
import { VehicleService } from "../services/vehicle.service";
import { SmartCardService } from "../services/smartcard.service";
import { LostFoundService } from "../services/lostfound.service";
import { DoorbellService } from "../services/doorbell.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";
import { Vehicle } from "../models/Vehicle";
import { House } from "../models/House";
import { SmartCard } from "../models/SmartCard";
import { LostFound } from "../models/LostFound";
import { Subscription } from "../models/Subscription";

export class QRController {
    private qrService = container.resolve(QRService);
    private vehicleService = container.resolve(VehicleService);
    private smartCardService = container.resolve(SmartCardService);
    private lostFoundService = container.resolve(LostFoundService);
    private doorbellService = container.resolve(DoorbellService);

    generateBatch = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { qrType, moduleType, count, batchInfo } = req.body;
            const qrs = await this.qrService.generateQRBatch(qrType, moduleType, count, batchInfo);
            return successResponse(req, res, "qr_batch_generated", qrs);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getInventory = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = req.body;
            const result = await this.qrService.getQRInventory({ page, limit, sortBy, sortOrder, search });
            return successResponse(req, res, "qr_inventory_retrieved", result);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
    getInventoryByBatch = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, status, moduleType, batchInfo } = req.body;
            const result = await this.qrService.getQRInventoryByBatch({ page, limit, sortBy, sortOrder, search, status, moduleType, batchInfo });
            return successResponse(req, res, "qr_inventory_retrieved", result);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
    getInventoryCounts = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, status, moduleType, batchInfo } = req.body;
            const result = await this.qrService.getInventoryCounts();
            return successResponse(req, res, "qr_inventory_retrieved", result);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    assignQR = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { qrId, moduleType, moduleProfileId, moduleData } = req.body;

            if (!qrId || !moduleType) {
                return errorResponse(req, res, "missing_required_fields", 400);
            }

            const models: any = { Vehicle, DoorBell: House, SmartCard, LostFound };

            if (!models[moduleType]) throw new Error("invalid_module_type");

            let moduleProfile;
            let finalModuleProfileId;

            // If moduleProfileId provided, validate existing profile
            if (moduleProfileId) {
                finalModuleProfileId = moduleProfileId;
                moduleProfile = await models[moduleType].findById(moduleProfileId);
                if (!moduleProfile) throw new Error("profile_not_found");
                if (moduleProfile.userId.toString() !== userId.toString()) throw new Error("unauthorized");
            }
            // If no moduleProfileId, create new profile with moduleData
            else {
                if (!moduleData) throw new Error("module_data_required_for_new_profile");

                // Create profile based on moduleType
                if (moduleType === 'Vehicle') {
                    moduleProfile = await this.vehicleService.fetchAndCreateVehicle(userId, moduleData.vehicleNumber, moduleData.chassisNumber, 'Full');
                } else if (moduleType === 'DoorBell') {
                    moduleProfile = await this.doorbellService.createHouse(userId, moduleData, 'Full');
                } else if (moduleType === 'SmartCard') {
                    moduleProfile = await this.smartCardService.createSmartCard(userId, moduleData, 'Full');
                } else if (moduleType === 'LostFound') {
                    moduleProfile = await this.lostFoundService.createItem(userId, moduleData, 'Full');
                }

                finalModuleProfileId = moduleProfile?._id.toString();
            }

            const subscription = await Subscription.findOne({ userId, status: 'active' });
            const userPlan = subscription?.plan || 'Free';

            const qr = await this.qrService.assignQR(qrId, userId.toString(), moduleType, finalModuleProfileId, userPlan);
            return successResponse(req, res, "qr_assigned_successfully", { qr, profile: moduleProfile });
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getMyQRs = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const qrs = await this.qrService.getOwnerQRs(userId);
            return successResponse(req, res, "qrs_retrieved", qrs);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    suspendQR = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { qrId } = req.body;
            const qr = await this.qrService.suspendQR(qrId, userId);
            return successResponse(req, res, "qr_suspended", qr);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    reactivateQR = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { qrId } = req.body;
            const qr = await this.qrService.reactivateQR(qrId, userId);
            return successResponse(req, res, "qr_reactivated", qr);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    // activatePhysicalQR = async (req: AuthenticatedRequest, res: Response) => {
    //     try {
    //         const userId = req.user?._id;
    //         const { qrCode, moduleType, moduleProfileId } = req.body;

    //         if (!qrCode || !moduleType || !moduleProfileId) {
    //             return errorResponse(req, res, "missing_required_fields", 400);
    //         }

    //         const qr = await this.qrService.activatePhysicalQR(qrCode, userId, moduleType, moduleProfileId);
    //         return successResponse(req, res, "physical_qr_activated_successfully", qr);
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message, 400);
    //     }
    // };

    getPurchasedQRs = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { status, moduleType } = req.query;

            const qrs = await this.qrService.getUserPurchasedQRs(userId, {
                status: status as string,
                moduleType: moduleType as string
            });

            return successResponse(req, res, "purchased_qrs_retrieved", qrs);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
}
