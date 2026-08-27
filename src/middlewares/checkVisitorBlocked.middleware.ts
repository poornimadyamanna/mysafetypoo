import { Response, NextFunction } from "express";
import { container } from "tsyringe";
import { AuthenticatedRequest } from "./auth.middleware";
import { BlockedVisitorService } from "../services/blockedvisitor.service";
import { Visitor } from "../models/Visitor";
import { QR } from "../models/QR";

export const checkVisitorBlocked = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const visitorId = req.visitor?.visitorId;
        if (!visitorId) return next();

        const { qrId } = req.body;
        if (!qrId) return next();

        // Get visitor phone
        const visitor = await Visitor.findById(visitorId).select("mobile").lean();
        if (!visitor) return next();

        // Get QR owner
        const qr = await QR.findOne({ qrId }).select("ownerId").lean();
        if (!qr || !qr.ownerId) return next();

        const ownerId = qr.ownerId.toString();

        // Check if visitor is blocked by phone
        const blockedVisitorService = container.resolve(BlockedVisitorService);
        const isBlocked = await blockedVisitorService.isVisitorBlockedByPhone(ownerId, visitor.mobile);

        if (isBlocked) {
            return res.status(403).json({
                success: false,
                message: "visitor_blocked_by_owner",
                blocked: true
            });
        }

        next();
    } catch (error) {
        next();
    }
};
