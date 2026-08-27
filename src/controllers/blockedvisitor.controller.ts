import { Response } from "express";
import { container } from "tsyringe";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";
import { BlockedVisitorService } from "../services/blockedvisitor.service";

export class BlockedVisitorController {
    private blockedVisitorService = container.resolve(BlockedVisitorService);

    blockVisitor = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const ownerId = req.user?._id;
            const { phone, reason } = req.body;

            const blocked = await this.blockedVisitorService.blockVisitorByPhone(ownerId, phone, reason);

            return successResponse(req, res, "visitor_blocked_successfully", blocked);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    unblockVisitor = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const ownerId = req.user?._id;
            const { phone } = req.body;

            const result = await this.blockedVisitorService.unblockVisitorByPhone(ownerId, phone);

            return successResponse(req, res, "visitor_unblocked_successfully", result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    getBlockedVisitors = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const ownerId = req.user?._id;

            const blocked = await this.blockedVisitorService.getBlockedVisitors(ownerId);

            return successResponse(req, res, "blocked_visitors_retrieved", blocked);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
}
