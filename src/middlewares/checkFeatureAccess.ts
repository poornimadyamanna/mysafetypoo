import { Response, NextFunction } from 'express';
import { Subscription } from '../models/Subscription';
import { errorResponse } from '../utils/response';
import { AuthenticatedRequest } from './auth.middleware';
import { isAllowed, isPremiumFeature } from '../utils/featureMatrix';

export const checkFeatureAccess = (moduleType: string, feature: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?._id;

            // Get user subscription
            const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();

            // Default to Free if no subscription found
            const userPlan = subscription?.plan || 'Free';

            // If Free plan, check if feature is premium
            if (userPlan === 'Free') {
                const isPremium = await isAllowed(moduleType, feature, userPlan, req.body);

                if (!isPremium) {
                    return res.status(403).json({
                        success: false,
                        message: 'feature_requires_premium',
                        feature,
                        upgrade: {
                            message: 'This feature requires a Premium QR code',
                            actions: {
                                purchase: '/api/user/orders/create',
                                pricing: '/api/user/pricing'
                            }
                        }
                    });
                }
            }

            next();
        } catch (error) {
            return await errorResponse(req, res, 'server.error', 500);
        }
    };
};
