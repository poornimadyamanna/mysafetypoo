import { Response } from "express";
import { container } from "tsyringe";
import { LostFoundService } from "../services/lostfound.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";

export class LostFoundController {
    private lostFoundService = container.resolve(LostFoundService);

    createItem = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const item = await this.lostFoundService.createItem(userId, req.body);
            return successResponse(req, res, "item_created", item);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getItems = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const items = await this.lostFoundService.getItems(userId);
            return successResponse(req, res, "items_retrieved", items);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    updateItem = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { itemId, ...updates } = req.body;
            const item = await this.lostFoundService.updateItem(itemId, userId, updates);
            return successResponse(req, res, "item_updated", item);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    deleteItem = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { itemId } = req.body;
            const result = await this.lostFoundService.deleteItem(itemId, userId);
            return successResponse(req, res, "item_deleted", result);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getEvents = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const events = await this.lostFoundService.getEvents(userId);
            return successResponse(req, res, "events_retrieved", events);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    updateEventStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { eventId, status } = req.body;
            const event = await this.lostFoundService.updateEventStatus(eventId, userId, status);
            return successResponse(req, res, "event_status_updated", event);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };


    manageHouseMembers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { itemId, familyMemberIds } = req.body;

            const result = await this.lostFoundService.manageHouseMembers(itemId, userId, familyMemberIds);

            return successResponse(req, res, 'house_members_updated_successfully', result);
        } catch (error: any) {
            // Handle limit exceeded error
            if (error.message.startsWith('family_member_limit_exceeded:')) {
                const limit = error.message.split(':')[1];
                return res.status(403).json({
                    success: false,
                    message: 'family_member_limit_exceeded',
                    limit: parseInt(limit),
                    upgrade: {
                        message: 'Upgrade to Premium for unlimited family members',
                        actions: {
                            upgrade: '/api/user/subscription/upgrade',
                            pricing: '/api/user/pricing'
                        }
                    }
                });
            }
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    getHouseMembers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { itemId } = req.body;

            const members = await this.lostFoundService.getHouseMembers(itemId, userId);

            return successResponse(req, res, 'house_members_retrieved', members);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    reassignFrozenMembers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { itemId, memberIds } = req.body;

            const result = await this.lostFoundService.reassignFrozenMembers(itemId, userId, memberIds);

            return successResponse(req, res, 'frozen_members_reassigned', result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
}
