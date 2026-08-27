import { Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { errorResponse, successResponse } from '../utils/response';

export class AnalyticsController {
    private analyticsService = new AnalyticsService();

    getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const stats = await this.analyticsService.getDashboardStats();
            return successResponse(req, res, 'dashboard_stats_retrieved', stats);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getModuleStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const stats = await this.analyticsService.getModuleStats();
            return successResponse(req, res, 'module_stats_retrieved', stats);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getUserGrowth = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { days = 30 } = req.query;
            const growth = await this.analyticsService.getUserGrowth(Number(days));
            return successResponse(req, res, 'user_growth_retrieved', growth);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getRevenueGrowth = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { months = 6 } = req.query;
            const growth = await this.analyticsService.getRevenueGrowth(Number(months));
            return successResponse(req, res, 'revenue_growth_retrieved', growth);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getQRUsageStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const stats = await this.analyticsService.getQRUsageStats();
            return successResponse(req, res, 'qr_usage_stats_retrieved', stats);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getCallStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { days = 30 } = req.query;
            const stats = await this.analyticsService.getCallStats(Number(days));
            return successResponse(req, res, 'call_stats_retrieved', stats);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getTopUsers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { limit = 10 } = req.query;
            const users = await this.analyticsService.getTopUsers(Number(limit));
            return successResponse(req, res, 'top_users_retrieved', users);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getSubscriptionStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const stats = await this.analyticsService.getSubscriptionStats();
            return successResponse(req, res, 'subscription_stats_retrieved', stats);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };
}
