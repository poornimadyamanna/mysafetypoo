import { Request, Response } from "express";
import { container } from "tsyringe";
import { QRService } from "../services/qr.service";
import { VisitorService } from "../services/visitor.service";
import { ScanService } from "../services/scan.service";
import { ChatService } from "../services/chat.service";
import { VehicleService } from "../services/vehicle.service";
import { SmartCardService } from "../services/smartcard.service";
import { LostFoundService } from "../services/lostfound.service";
import { errorResponse, successResponse } from "../utils/response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { SubscriptionPlan } from "../models/SubscriptionPlan";
import { Subscription } from '../models/Subscription';
import { PredefinedMessageService } from "../services/predefinedmsg.service";

export class ScanController {
    private qrService = container.resolve(QRService);
    private visitorService = container.resolve(VisitorService);
    private scanService = container.resolve(ScanService);
    private chatService = container.resolve(ChatService);
    private vehicleService = container.resolve(VehicleService);
    private smartCardService = container.resolve(SmartCardService);
    private lostFoundService = container.resolve(LostFoundService);
    private predefinedMessageService = container.resolve(PredefinedMessageService);

    getSubscriptionFeatures = async (req: Request, res: Response) => {
        try {
            const { qrId } = req.body;
            if (!qrId) throw new Error("qrId is required");

            const { qr } = await this.qrService.resolveQR(qrId as string);
            if (!qr.ownerId) throw new Error("QR has no owner");

            const ownerId = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

            const subscription = await Subscription.findOne({ userId: ownerId, status: 'active' });
            const planType = subscription?.plan || 'Free';

            const plan = await SubscriptionPlan.findOne({ type: planType, isActive: true }).select('name type price currency features').lean();
            if (!plan) throw new Error("Subscription plan not found");

            const features = {
                DoorBell: plan.features.filter(f => f.moduleType === 'DoorBell'),
                Vehicle: plan.features.filter(f => f.moduleType === 'Vehicle'),
                SmartCard: plan.features.filter(f => f.moduleType === 'SmartCard'),
                LostFound: plan.features.filter(f => f.moduleType === 'LostFound')
            };

            return successResponse(req, res, "subscription_features_retrieved", {
                plan: {
                    name: plan.name,
                    type: plan.type,
                    price: plan.price,
                    currency: plan.currency,
                    features
                }
            });
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    resolveQR = async (req: Request, res: Response) => {
        try {
            const qrId = req.params.qrId as string;
            const { latitude, longitude } = req.query;
            const result: any = await this.qrService.resolveQR(
                qrId,
                latitude ? Number(latitude) : undefined,
                longitude ? Number(longitude) : undefined
            );
            let moduleKey = result.qr.moduleType.toLowerCase();
            result[moduleKey] = await result.profile
            delete result.profile
            return successResponse(req, res, "qr_resolved", result);
        } catch (error: any) {
            if (error.message === "qr_expired_purchase_required") {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                    actions: {
                        purchase: "/api/user/orders/create",
                        pricing: "/api/user/pricing"
                    }
                });
            }
            return errorResponse(req, res, error.message, 400);
        }
    };


    createChatRoomByVisitor = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { qrId, location } = req.body;
            const visitorId = req.visitor.visitorId;

            const { qr, profile } = await this.qrService.resolveQR(qrId);
            if (!qr.ownerId) throw new Error("QR has no owner");

            const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

            let visit: any = null;
            await this.scanService.logScan(qr._id, visitorId, "Visitor", qr.moduleType, location);

            if (qr.moduleType == 'DoorBell') {
                // await this.scanService.logScan(qr._id, visitorId, "Visitor", qr.moduleType);

                visit = await this.scanService.createDoorBellVisit(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    visitorId,
                    "Visitor",
                    location
                );
            }
            if (qr.moduleType == 'Vehicle') {

                visit = await this.vehicleService.createAlert(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    visitorId,
                    "Visitor",
                    location
                );
            }
            if (qr.moduleType == 'SmartCard') {

                visit = await this.smartCardService.logView(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    visitorId,
                    "Visitor",
                    "View",
                    location
                );
            }
            if (qr.moduleType == 'LostFound') {

                visit = await this.lostFoundService.reportFound(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    visitorId,
                    "Visitor",
                    location
                );
            }

            const chatRoom = await this.chatService.createChatRoom(
                qr._id.toString(),
                qr.moduleType,
                profile._id.toString(),
                visit._id.toString(),
                visitorId,
                "Visitor",
                ownerIdStr
            );

            return successResponse(req, res, "chat_room_created", { chatRoom, visit });
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };



    getPredefinedMessage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { qrId } = req.body;
            const messages = await this.predefinedMessageService.getPredefinedMessagesForVisitor(qrId);
            return successResponse(req, res, "predefined_messages", messages);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    }

    getVehicleInsurance = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { qrId } = req.body;
            const messages = await this.vehicleService.getVehicleInsurance(qrId);
            return successResponse(req, res, "vehicle_insurance", messages);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    }
    initiateAutoGeneratedCall = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { qrId, audioCode } = req.body;
            const messages = await this.vehicleService.initiateAutoGeneratedCall(qrId, audioCode);
            return successResponse(req, res, "auto_call_initiation_success", messages);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    }
    getSmartCardDetails = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { qrId } = req.body;
            const messages = await this.vehicleService.getSmartCardDetails(qrId);
            return successResponse(req, res, "auto_call_initiation_success", messages);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    }

    // createVehicleChat = async (req: AuthenticatedRequest, res: Response) => {
    //     try {
    //         const { qrId, alertType, location, notes, photos } = req.body;
    //         const visitorId = req.visitor.visitorId;

    //         const { qr, profile } = await this.qrService.resolveQR(qrId);
    //         if (!qr.ownerId) throw new Error("QR has no owner");

    //         const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

    //         await this.scanService.logScan(qr._id, visitorId, "Visitor", "Vehicle", location);

    //         const alert = await this.vehicleService.createAlert(
    //             qr._id,
    //             profile._id,
    //             qr.ownerId,
    //             visitorId,
    //             "Visitor",
    //             // { alertType, location, notes, photos }
    //         );

    //         const chatRoom = await this.chatService.createChatRoom(
    //             qr._id.toString(),
    //             "Vehicle",
    //             profile._id.toString(),
    //             alert._id.toString(),
    //             visitorId,
    //             "Visitor",
    //             ownerIdStr
    //         );

    //         return successResponse(req, res, "chat_room_created", { chatRoom, alert });
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message, 400);
    //     }
    // };

    // createSmartCardChat = async (req: AuthenticatedRequest, res: Response) => {
    //     try {
    //         const { qrId, action, location } = req.body;
    //         const visitorId = req.visitor.visitorId;

    //         const { qr, profile } = await this.qrService.resolveQR(qrId);
    //         if (!qr.ownerId) throw new Error("QR has no owner");

    //         const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

    //         await this.scanService.logScan(qr._id, visitorId, "Visitor", "SmartCard", location);

    //         const viewEvent = await this.smartCardService.logView(
    //             qr._id,
    //             profile._id,
    //             qr.ownerId,
    //             visitorId,
    //             "Visitor",
    //             action || "View",
    //             location
    //         );

    //         const chatRoom = await this.chatService.createChatRoom(
    //             qr._id.toString(),
    //             "SmartCard",
    //             profile._id.toString(),
    //             viewEvent._id.toString(),
    //             visitorId,
    //             "Visitor",
    //             ownerIdStr
    //         );

    //         return successResponse(req, res, "chat_room_created", { chatRoom, profile });
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message, 400);
    //     }
    // };

    // createLostFoundChat = async (req: AuthenticatedRequest, res: Response) => {
    //     try {
    //         const { qrId, message, photos, location } = req.body;
    //         const visitorId = req.visitor.visitorId;

    //         const { qr, profile } = await this.qrService.resolveQR(qrId);
    //         if (!qr.ownerId) throw new Error("QR has no owner");

    //         const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

    //         await this.scanService.logScan(qr._id, visitorId, "Visitor", "LostFound", location);

    //         const event = await this.lostFoundService.reportFound(
    //             qr._id,
    //             profile._id,
    //             qr.ownerId,
    //             visitorId,
    //             "Visitor",
    //             { message, photos, location }
    //         );

    //         const chatRoom = await this.chatService.createChatRoom(
    //             qr._id.toString(),
    //             "LostFound",
    //             profile._id.toString(),
    //             event._id.toString(),
    //             visitorId,
    //             "Visitor",
    //             ownerIdStr
    //         );

    //         return successResponse(req, res, "chat_room_created", { chatRoom, event });
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message, 400);
    //     }
    // };

    // Authenticated User Scan Methods (No OTP required)

    createChatRoomByUser = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { qrId, location } = req.body;
            const userId = req.user._id;

            const { qr, profile } = await this.qrService.resolveQR(qrId);
            if (!qr.ownerId) throw new Error("QR has no owner");

            const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

            await this.scanService.logScan(qr._id, userId, "User", qr.moduleType);

            let visit: any = null;

            if (qr.moduleType == 'DoorBell') {

                visit = await this.scanService.createDoorBellVisit(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    userId,
                    "User",
                    location
                );
            }
            if (qr.moduleType == 'Vehicle') {

                visit = await this.vehicleService.createAlert(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    userId,
                    "User",
                    location
                );
            }
            if (qr.moduleType == 'SmartCard') {

                visit = await this.smartCardService.logView(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    userId,
                    "User",
                    "View",
                    location
                );
            }
            if (qr.moduleType == 'LostFound') {

                visit = await this.lostFoundService.reportFound(
                    qr._id,
                    profile._id,
                    qr.ownerId,
                    userId,
                    "User",
                    location
                );
            }

            const chatRoom = await this.chatService.createChatRoom(
                qr._id.toString(),
                "DoorBell",
                profile._id.toString(),
                visit._id.toString(),
                userId,
                "User",
                ownerIdStr
            );

            return successResponse(req, res, "chat_room_created", { chatRoom, visit });
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    // userScanVehicle = async (req: Request, res: Response) => {
    //     try {
    //         const { qrId, alertType, location, notes, photos } = req.body;
    //         const userId = (req as any).user.userId;

    //         const { qr, profile } = await this.qrService.resolveQR(qrId);
    //         if (!qr.ownerId) throw new Error("QR has no owner");

    //         const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

    //         await this.scanService.logScan(qr._id, userId, "User", "Vehicle", location);

    //         const alert = await this.vehicleService.createAlert(
    //             qr._id,
    //             profile._id,
    //             qr.ownerId,
    //             userId,
    //             "User",
    //             location
    //         );

    //         const chatRoom = await this.chatService.createChatRoom(
    //             qr._id.toString(),
    //             "Vehicle",
    //             profile._id.toString(),
    //             alert._id.toString(),
    //             userId,
    //             "User",
    //             ownerIdStr
    //         );

    //         return successResponse(req, res, "chat_room_created", { chatRoom, alert });
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message, 400);
    //     }
    // };

    // userScanSmartCard = async (req: Request, res: Response) => {
    //     try {
    //         const { qrId, action, location } = req.body;
    //         const userId = (req as any).user.userId;

    //         const { qr, profile } = await this.qrService.resolveQR(qrId);
    //         if (!qr.ownerId) throw new Error("QR has no owner");

    //         const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

    //         await this.scanService.logScan(qr._id, userId, "User", "SmartCard", location);

    //         const viewEvent = await this.smartCardService.logView(
    //             qr._id,
    //             profile._id,
    //             qr.ownerId,
    //             userId,
    //             "User",
    //             action || "View",
    //             location
    //         );

    //         const chatRoom = await this.chatService.createChatRoom(
    //             qr._id.toString(),
    //             "SmartCard",
    //             profile._id.toString(),
    //             viewEvent._id.toString(),
    //             userId,
    //             "User",
    //             ownerIdStr
    //         );

    //         return successResponse(req, res, "chat_room_created", { chatRoom, profile });
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message, 400);
    //     }
    // };

    // userScanLostFound = async (req: Request, res: Response) => {
    //     try {
    //         const { qrId, message, photos, location } = req.body;
    //         const userId = (req as any).user.userId;

    //         const { qr, profile } = await this.qrService.resolveQR(qrId);
    //         if (!qr.ownerId) throw new Error("QR has no owner");

    //         const ownerIdStr = qr.ownerId._id ? qr.ownerId._id.toString() : qr.ownerId.toString();

    //         await this.scanService.logScan(qr._id, userId, "User", "LostFound", location);

    //         const event = await this.lostFoundService.reportFound(
    //             qr._id,
    //             profile._id,
    //             qr.ownerId,
    //             userId,
    //             "User",
    //             { message, photos, location }
    //         );

    //         const chatRoom = await this.chatService.createChatRoom(
    //             qr._id.toString(),
    //             "LostFound",
    //             profile._id.toString(),
    //             event._id.toString(),
    //             userId,
    //             "User",
    //             ownerIdStr
    //         );

    //         return successResponse(req, res, "chat_room_created", { chatRoom, event });
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message, 400);
    //     }
    // };
}
