import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { SubscriptionService } from '../services/subscription.service';
import { errorResponse, successResponse } from '../utils/response';
import { getAllFeaturesForPlan } from '../utils/featureMatrix';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { SubscriptionPlan } from '../models/SubscriptionPlan';

export class SubscriptionController {
    private subscriptionService = container.resolve(SubscriptionService);

    getMySubscription = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const subscription = await this.subscriptionService.getUserSubscription(userId);

            if (!subscription) {
                return await errorResponse(req, res, 'subscription_not_found', 404);
            }

            const plan = subscription.plan as 'Free' | 'Premium';
            const allFeatures = await getAllFeaturesForPlan(plan);
            const subscriptionPlan = await SubscriptionPlan.findOne({ type: plan, isActive: true }).lean();

            return await successResponse(req, res, 'subscription_retrieved', {
                subscription: {
                    plan: subscription.plan,
                    status: subscription.status,
                    startDate: subscription.startDate,
                    endDate: subscription.endDate,
                    autoRenew: subscription.autoRenew
                },
                planDetails: subscriptionPlan ? {
                    planId: subscriptionPlan._id,
                    name: subscriptionPlan.name,
                    price: subscriptionPlan.price,
                    currency: subscriptionPlan.currency
                } : null,
                features: allFeatures,
                canUpgrade: plan === 'Free' && subscription.status === 'active'
            });
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    initiateSubscription = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { planId } = req.body;

            if (!planId) {
                return await errorResponse(req, res, 'plan_id_required', 400);
            }

            const result = await this.subscriptionService.initiateSubscription(req.user._id, planId);

            return await successResponse(req, res, 'subscription_initiated', {
                ...result,
                razorpayKey: process.env.RAZORPAY_KEY_ID
            });
        } catch (error: any) {
            // const statusCode = error.message === 'already_premium_subscriber' || 
            //                    error.message === 'pending_subscription_exists' || 
            //                    error.message === 'invalid_plan' || 
            //                    error.message === 'razorpay_plan_not_configured' ? 400 : 
            //                    error.message === 'user_not_found' ? 404 : 500;
            return await errorResponse(req, res, error.message, 400);
        }
    };

    verifySubscriptionPayment = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { razorpaySubscriptionId, razorpayPaymentId, razorpaySignature } = req.body;

            if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) {
                return await errorResponse(req, res, 'missing_payment_details', 400);
            }

            const subscription = await this.subscriptionService.verifyAndActivateSubscription(
                req.user._id,
                razorpaySubscriptionId,
                razorpayPaymentId,
                razorpaySignature
            );

            return await successResponse(req, res, 'subscription_activated', { subscription });
        } catch (error: any) {
            const statusCode = error.message === 'invalid_signature' || 
                               error.message === 'payment_already_processed' || 
                               error.message === 'payment_failed' ? 400 : 
                               error.message === 'subscription_not_found' ? 404 : 500;
            return await errorResponse(req, res, error.message, statusCode);
        }
    };

    cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const subscription = await this.subscriptionService.cancelPremiumSubscription(req.user._id);
            return await successResponse(req, res, 'subscription_cancelled', { subscription });
        } catch (error: any) {
            const statusCode = error.message === 'no_active_premium_subscription' ? 404 : 500;
            return await errorResponse(req, res, error.message, statusCode);
        }
    };

    getAvailablePlans = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const plans = await this.subscriptionService.getAvailablePlans();
            return await successResponse(req, res, 'subscription_plans_retrieved', {
                plans,
                razorpayKey: process.env.RAZORPAY_KEY_ID
            });
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    syncSubscriptionStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.subscriptionService.syncSubscriptionStatus(req.user._id);
            return await successResponse(req, res, 'subscription_synced', result);
        } catch (error: any) {
            const statusCode = error.message === 'subscription_not_found' ? 404 : 500;
            return await errorResponse(req, res, error.message, statusCode);
        }
    };
}
