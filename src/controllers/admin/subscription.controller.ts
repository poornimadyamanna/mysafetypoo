import { Response } from 'express';
import { errorResponse, successResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { SubscriptionPlan } from '../../models/SubscriptionPlan';
import { RazorpayService } from '../../services/razorpay.service';

export class AdminSubscriptionController {
    private razorpayService = new RazorpayService();

    getAllPlans = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const plans = await SubscriptionPlan.find().sort({ type: 1, price: 1 }).lean();
            return await successResponse(req, res, 'subscription_plans_retrieved', plans);
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    createPlan = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { name, type, price, currency, features } = req.body;

            let razorpayPlanId;

            // Create Razorpay plan only for Premium
            if (type === 'Premium' && price > 0) {
                const razorpayPlan: any = await this.razorpayService.createPlan(
                    name,
                    price,
                    currency || 'INR',
                    'yearly',
                    1
                );
                razorpayPlanId = razorpayPlan.id;
            }

            const plan = await SubscriptionPlan.create({
                name,
                type,
                price,
                currency,
                razorpayPlanId,
                features
            });

            return await successResponse(req, res, 'subscription_plan_created', plan);
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    updatePlan = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { planId, price, name, currency } = req.body;
            const updates = req.body;

            const existingPlan = await SubscriptionPlan.findById(planId);
            if (!existingPlan) throw new Error('plan_not_found');

            // If price changed for Premium, create new Razorpay plan
            if (existingPlan.type === 'Premium' && price && price !== existingPlan.price) {
                const razorpayPlan: any = await this.razorpayService.createPlan(
                    name || existingPlan.name,
                    price,
                    currency || existingPlan.currency,
                    'yearly',
                    1
                );

                updates.razorpayPlanId = razorpayPlan.id;
            }

            const plan = await SubscriptionPlan.findByIdAndUpdate(planId, updates, { new: true });

            return await successResponse(req, res, 'subscription_plan_updated', plan);
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    deletePlan = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { planId } = req.body;

            const plan = await SubscriptionPlan.findByIdAndDelete(planId);
            if (!plan) throw new Error('plan_not_found');

            return await successResponse(req, res, 'subscription_plan_deleted', { planId });
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };
}
