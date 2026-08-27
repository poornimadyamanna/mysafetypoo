import { Response } from "express";
import { container } from "tsyringe";
import { SmartCardService } from "../services/smartcard.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";

export class SmartCardController {
    private smartCardService = container.resolve(SmartCardService);

    createSmartCard = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const card = await this.smartCardService.createSmartCard(userId, req.body);
            return successResponse(req, res, "smartcard_created", card);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getSmartCards = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const cards = await this.smartCardService.getSmartCards(userId);
            return successResponse(req, res, "smartcards_retrieved", cards);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    updateSmartCardLinks = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { cardId,
                activeSocialLinks
            } = req.body;
            const card = await this.smartCardService.updateSmartCard(cardId, userId, {
                activeSocialLinks
            });
            return successResponse(req, res, "smartcard_updated", card);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
    updateSmartCard = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { cardId,
                resumeUrl,
                profilePhotoUrl,
                bio,
                businessName,
                siteName,
                siteUrl
            } = req.body;
            const card = await this.smartCardService.updateSmartCard(cardId, userId, {
                resumeUrl,
                profilePhotoUrl,
                bio,
                businessName,
                siteName,
                siteUrl
            });
            return successResponse(req, res, "smartcard_updated", card);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
    toggleActiveLink = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { cardId, type, isActive } = req.body;
            const card = await this.smartCardService.toggleActiveLink(cardId, userId, type, isActive);
            return successResponse(req, res, "smartcard_updated", card);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    deleteSmartCard = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { cardId } = req.body;
            const result = await this.smartCardService.deleteSmartCard(cardId, userId);
            return successResponse(req, res, "smartcard_deleted", result);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getAnalytics = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { cardId } = req.query;
            const analytics = await this.smartCardService.getAnalytics(userId, cardId as string);
            return successResponse(req, res, "analytics_retrieved", analytics);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
}
