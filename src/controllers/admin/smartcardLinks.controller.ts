import { Response } from 'express';
import { errorResponse, successResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { SmartCardLinkMaster } from '../../models/SmartCardLinkMaster';

export class AdminSmartCardLinksController {
    getAllLinks = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const plans = await SmartCardLinkMaster.find().sort({ type: -1, price: 1 }).lean();
            return await successResponse(req, res, 'subscription_plans_retrieved', plans);
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    createLink = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { webSiteName, type, logoUrl } = req.body;

            const link = await SmartCardLinkMaster.create({
                webSiteName,
                type,
                logoUrl
            });

            return await successResponse(req, res, 'subscription_plan_created', link);
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    updateLink = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { linkId } = req.body;
            const updates = req.body;

            const link = await SmartCardLinkMaster.findByIdAndUpdate(linkId, updates, { new: true });
            if (!link) throw new Error('plan_not_found');

            return await successResponse(req, res, 'subscription_plan_updated', link);
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    deleteLink = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { linkId } = req.query;

            const link = await SmartCardLinkMaster.findByIdAndDelete(linkId);
            if (!link) throw new Error('plan_not_found');

            return await successResponse(req, res, 'subscription_plan_deleted', { linkId });
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };
}
