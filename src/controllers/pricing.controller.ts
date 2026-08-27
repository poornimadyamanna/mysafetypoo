import { Request, Response } from "express";
import { container } from "tsyringe";
import { PricingService } from "../services/pricing.service";
import { errorResponse, successResponse } from "../utils/response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export class PricingController {
    private pricingService = container.resolve(PricingService);

    createOrUpdatePricing = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { moduleType, downloadPrice, basePrice, bulkDiscounts } = req.body;
            const pricing = await this.pricingService.createOrUpdatePricing(moduleType, downloadPrice, basePrice, bulkDiscounts);
            return successResponse(req, res, "pricing_saved", pricing);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getPricing = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { moduleType } = req.body;
            const pricing = await this.pricingService.getPricing(moduleType);
            return successResponse(req, res, "pricing_retrieved", pricing);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getAllPricing = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pricing = await this.pricingService.getAllPricing();
            return successResponse(req, res, "pricing_retrieved", pricing);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    calculatePrice = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { moduleType, quantity, priceType } = req.body;
            const priceDetails = await this.pricingService.calculatePriceForDirectOrder(moduleType, quantity, priceType);
            return successResponse(req, res, "price_calculated", priceDetails);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    deletePricing = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { moduleType } = req.body;
            await this.pricingService.deletePricing(moduleType);
            return successResponse(req, res, "pricing_deleted", null);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
}
