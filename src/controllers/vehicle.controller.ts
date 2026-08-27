import { Response } from "express";
import { container } from "tsyringe";
import { VehicleService } from "../services/vehicle.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";
import logger from "../config/logger";

export class VehicleController {
    private vehicleService = container.resolve(VehicleService);

    createVehicle = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const vehicle = await this.vehicleService.createVehicle(userId, req.body);
            return successResponse(req, res, "vehicle_created", vehicle);
        } catch (error: any) {
            logger.error("Create vehicle failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    fetchAndCreateVehicle = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { vehicleNumber, chassisNumber, creationType } = req.body;

            if (!vehicleNumber) {
                return errorResponse(req, res, "vehicleNumber and chassisNumber are required", 400);
            }

            const vehicle = await this.vehicleService.fetchAndCreateVehicle(userId, vehicleNumber, chassisNumber, creationType);
            return successResponse(req, res, "vehicle_created", vehicle);
        } catch (error: any) {
            logger.error("Fetch and create vehicle failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    createManualVehicle = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { vehicleNumber, model, vehicleType } = req.body;

            if (!vehicleNumber || !model || !vehicleType) {
                return errorResponse(req, res, "vehicleNumber, model, and vehicleType are required", 400);
            }

            const vehicle = await this.vehicleService.createManualVehicle(userId, vehicleNumber, model, vehicleType);
            return successResponse(req, res, "vehicle_created", vehicle);
        } catch (error: any) {
            logger.error("Create manual vehicle failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    getVehicles = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const vehicles = await this.vehicleService.getVehicles(userId);
            return successResponse(req, res, "vehicles_retrieved", vehicles);
        } catch (error: any) {
            logger.error("Get vehicles failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };
    getChallan = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { vehicleId } = req.body;
            const vehicles = await this.vehicleService.getChallan(userId, vehicleId);
            return successResponse(req, res, "vehicles_retrieved", vehicles);
        } catch (error: any) {
            logger.error("Get challan failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    getVehicleDetails = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { vehicleId } = req.body;
            const vehicle = await this.vehicleService.getVehicleDetails(vehicleId as string, userId);
            return successResponse(req, res, "vehicle_details_retrieved", vehicle);
        } catch (error: any) {
            logger.error("Get vehicle details failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    updateVehicle = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { vehicleId, ...updates } = req.body;
            const vehicle = await this.vehicleService.updateVehicle(vehicleId, userId, updates);
            return successResponse(req, res, "vehicle_updated", vehicle);
        } catch (error: any) {
            logger.error("Update vehicle failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    deleteVehicle = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { vehicleId } = req.body;
            const result = await this.vehicleService.deleteVehicle(vehicleId, userId);
            return successResponse(req, res, "vehicle_deleted", result);
        } catch (error: any) {
            logger.error("Delete vehicle failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    getAlerts = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const alerts = await this.vehicleService.getAlerts(userId);
            return successResponse(req, res, "alerts_retrieved", alerts);
        } catch (error: any) {
            logger.error("Get alerts failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    resolveAlert = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { alertId } = req.body;
            const alert = await this.vehicleService.resolveAlert(alertId, userId);
            return successResponse(req, res, "alert_resolved", alert);
        } catch (error: any) {
            logger.error("Resolve alert failed:", error);
            return errorResponse(req, res, error.message, 400);
        }
    };

    createPredefinedMessage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId, title, message } = req.body;
            const messageData = { title, message };

            const createdMessage = await this.vehicleService.createPredefinedMessage(vehicleId, messageData);

            return successResponse(req, res, 'predefined_message_created_successfully', createdMessage);
        } catch (error: any) {
            logger.error("Create predefined message failed:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    getPredefinedMessages = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId } = req.body;

            const messages = await this.vehicleService.getPredefinedMessages(vehicleId);

            return successResponse(req, res, 'predefined_messages_retrieved', messages);
        } catch (error: any) {  
            logger.error("Get predefined messages failed:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    updatePredefinedMessage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { messageId, title, message } = req.body;
            const updates = { title, message };

            const updatedMessage = await this.vehicleService.updatePredefinedMessage(messageId, updates);

            return successResponse(req, res, 'predefined_message_updated_successfully', updatedMessage);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    deletePredefinedMessage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { messageId } = req.body;

            const result = await this.vehicleService.deletePredefinedMessage(messageId);

            return successResponse(req, res, 'predefined_message_deleted_successfully', result);
        } catch (error: any) {
            logger.error("Delete predefined message failed:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };





    /**
   * POST /vehicle/rc/verify
   * Body: { regNo: string, chassisNo: string, uid?: string, fullName?: string }
   */
    verifyRc = async (req: AuthenticatedRequest | Request, res: Response) => {
        try {
            const { regNo, chassisNo, uid, fullName } = req.body || {};

            if (!regNo || !chassisNo) {
                return errorResponse(
                    req as any,
                    res,
                    "regNo and chassisNo are required",
                    400
                );
            }

            const result = await this.vehicleService.fetchRVCertificate({
                regNo,
                chassisNo,
                uid,
                fullName,
            });

            return successResponse(req as any, res, "vehicle_rc_fetched", {
                summary: result.summary,
                certificate: result.certificate,
                rawXml: result.rawXml, // you can remove this if you don't want to expose raw XML
            });
        } catch (error: any) {
            logger.error("Verify RC failed:", error);
            return errorResponse(
                req as any,
                res,
                error.message || "something_went_wrong",
                500
            );
        }
    };
}
