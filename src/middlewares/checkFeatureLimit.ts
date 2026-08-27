import { Response, NextFunction } from 'express';
import { Subscription } from '../models/Subscription';
import { errorResponse } from '../utils/response';
import { AuthenticatedRequest } from './auth.middleware';
import { getFeatureLimit } from '../utils/featureMatrix';
import { isUserInTrialPeriod } from '../utils/trialPeriod';

export const checkFeatureLimit = (moduleType: string, featureKey: string, getCurrentUsage: (userId: string) => Promise<number>) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?._id;

            // Check if user has active trial period
            const inTrialPeriod = await isUserInTrialPeriod(userId, moduleType);

            // If in trial period, grant unlimited access
            if (inTrialPeriod) {
                return next();
            }

            const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
            const userPlan = subscription?.plan || 'Free';

            const limit = await getFeatureLimit(moduleType, userPlan, featureKey);
            
            // null = unlimited
            if (limit === null) {
                return next();
            }

            const currentUsage = await getCurrentUsage(userId);

            if (currentUsage >= limit) {
                return res.status(403).json({
                    success: false,
                    message: 'trial_period_expired',
                    featureKey,
                    limit,
                    currentUsage,
                    upgrade: {
                        message: 'Your trial period has ended. Purchase a physical QR code for unlimited access.',
                        actions: {
                            purchase: '/api/user/orders/create',
                            pricing: '/api/user/pricing'
                        }
                    }
                });
            }

            next();
        } catch (error) {
            return await errorResponse(req, res, 'server.error', 500);
        }
    };
};
