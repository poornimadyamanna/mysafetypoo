import { Response } from "express";
import { container } from "tsyringe";
import { VehicleService } from "../services/vehicle.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";
import { PredefinedMessageService } from "../services/predefinedmsg.service";

export class PredefinedMessageController {
    private predefinedMessageService = container.resolve(PredefinedMessageService);

    createPredefinedMessage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { title, message, moduleType } = req.body;

            const createdMessage = await this.predefinedMessageService.createPredefinedMessage({ title, message, moduleType, userId });

            return successResponse(req, res, 'predefined_message_created_successfully', createdMessage);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    getPredefinedMessages = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { moduleType } = req.body;

            const messages = await this.predefinedMessageService.getPredefinedMessages(userId, moduleType);

            return successResponse(req, res, 'predefined_messages_retrieved', messages);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    updatePredefinedMessage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { messageId, title, message } = req.body;
            const updates = { title, message };

            const updatedMessage = await this.predefinedMessageService.updatePredefinedMessage(messageId, userId, updates);

            return successResponse(req, res, 'predefined_message_updated_successfully', updatedMessage);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    deletePredefinedMessage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { messageId } = req.body;

            const result = await this.predefinedMessageService.deletePredefinedMessage(messageId, userId);

            return successResponse(req, res, 'predefined_message_deleted_successfully', result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

}
