import { injectable } from 'tsyringe';
import { Subscription } from '../models/Subscription';
import { Transaction } from '../models/Transaction';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { User } from '../models/User';
import { RazorpayService } from './razorpay.service';
import { schedulePendingSubscriptionCleanup, cancelPendingSubscriptionCleanup } from '../queues/subscription-cleanup.queue';
import crypto from 'crypto';
import logger from "../config/logger";

@injectable()
export class SubscriptionService {
    private razorpayService = new RazorpayService();

    getUserSubscription = async (userId: string) => {
        // Fetch active subscription, prioritize Premium over Free
        let subscription = await Subscription.findOne({ 
            userId, 
            status: 'active',
            plan: 'Premium'
        }).sort({ createdAt: -1 }).lean();

        // If no Premium, check for Free
        if (!subscription) {
            subscription = await Subscription.findOne({ 
                userId, 
                status: 'active',
                plan: 'Free'
            }).sort({ createdAt: -1 }).lean();
        }

        // If no subscription exists, create Free subscription
        if (!subscription) {
            const newSubscription = await Subscription.create({
                userId,
                plan: 'Free',
                status: 'active',
                startDate: new Date()
            });
            subscription = newSubscription.toObject() as any;
        }

        return subscription;
    };

    initiateSubscription = async (userId: string, planId: string) => {
        // Check if user already has active Premium subscription
        const existingSubscription = await Subscription.findOne({ userId, plan: 'Premium', status: 'active' });
        if (existingSubscription) {
            throw new Error('already_premium_subscriber');
        }

        // Check if pending Premium subscription already exists
        const pendingSubscription = await Subscription.findOne({ userId, plan: 'Premium', status: 'pending' });
        if (pendingSubscription) {
            throw new Error('pending_subscription_exists');
        }

        // Validate plan
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan || !plan.isActive || plan.type !== 'Premium') {
            throw new Error('invalid_plan');
        }

        if (!plan.razorpayPlanId) {
            throw new Error('razorpay_plan_not_configured');
        }

        // Fetch user details
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('user_not_found');
        }

        // Check for existing Razorpay customer from previous subscriptions
        const previousSubscription = await Subscription.findOne({ 
            userId, 
            razorpayCustomerId: { $exists: true, $ne: null } 
        }).sort({ createdAt: -1 }).lean();
        
        let razorpayCustomer: any;
        if (previousSubscription?.razorpayCustomerId) {
            razorpayCustomer = { id: previousSubscription.razorpayCustomerId };
        } else {
            // Create Razorpay customer
            razorpayCustomer = await this.razorpayService.createCustomer(
                user.name || 'User',
                user.email || `user${userId}@mysafety.com`,
                user.phone
            );
        }

        // Create Razorpay subscription
        const razorpaySubscription: any = await this.razorpayService.createSubscription(
            plan.razorpayPlanId,
            razorpayCustomer.id,
            12
        );

        // Create pending subscription in DB
        const newSubscription = await Subscription.create({
            userId,
            plan: 'Premium',
            status: 'pending',
            razorpaySubscriptionId: razorpaySubscription.id,
            razorpayCustomerId: razorpayCustomer.id,
            paymentMethod: 'razorpay',
            billingCycle: 'yearly'
        });

        // Schedule cleanup after 30 minutes
        await schedulePendingSubscriptionCleanup(newSubscription._id.toString());

        return {
            subscriptionId: razorpaySubscription.id,
            customerId: razorpayCustomer.id,
            planId: plan.razorpayPlanId,
            amount: plan.price,
            currency: plan.currency,
            name: user.name,
            email: user.email,
            contact: user.phone
        };
    };

    verifyAndActivateSubscription = async (userId: string, razorpaySubscriptionId: string, razorpayPaymentId: string, razorpaySignature: string) => {
        // Verify signature
        const text = `${razorpayPaymentId}|${razorpaySubscriptionId}`;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(text)
            .digest('hex');

        if (generated_signature !== razorpaySignature) {
            throw new Error('invalid_signature');
        }

        // Find pending subscription
        const subscription = await Subscription.findOne({
            userId,
            razorpaySubscriptionId,
            status: 'pending'
        });

        if (!subscription) {
            throw new Error('subscription_not_found');
        }

        // Check for duplicate transaction
        const existingTransaction = await Transaction.findOne({ transactionId: razorpayPaymentId });
        if (existingTransaction) {
            throw new Error('payment_already_processed');
        }

        // Fetch payment status
        let razorpayPayment: any;
        try {
            razorpayPayment = await this.razorpayService.fetchPaymentStatus(razorpayPaymentId);
        } catch (error: any) {
            // Payment might not exist yet, check subscription status
            const razorpaySubscription: any = await this.razorpayService.fetchSubscription(razorpaySubscriptionId);
            
            if (razorpaySubscription.status === 'active' || razorpaySubscription.status === 'authenticated' || razorpaySubscription.paid_count > 0) {
                // Delete existing Free subscription BEFORE activating Premium
                await Subscription.deleteMany({ userId, plan: 'Free' });

                const startDate = new Date();
                const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

                subscription.status = 'active';
                subscription.startDate = startDate;
                subscription.endDate = endDate;
                subscription.lastPaymentDate = startDate;
                subscription.nextBillingDate = endDate;
                subscription.autoRenew = true;
                await subscription.save();

                // Cancel pending cleanup job
                await cancelPendingSubscriptionCleanup(subscription._id.toString());

                // Create transaction record
                const plan = await SubscriptionPlan.findOne({ razorpayPlanId: razorpaySubscription.plan_id });
                await Transaction.create({
                    userId,
                    transactionType: 'SUBSCRIPTION_PAYMENT',
                    amount: plan?.price || 0,
                    currency: 'INR',
                    status: 'SUCCESS',
                    paymentMethod: 'razorpay',
                    transactionId: razorpayPaymentId,
                    subscriptionId: subscription._id
                });

                return subscription;
            }
            
            await Subscription.findByIdAndDelete(subscription._id);
            throw new Error('payment_not_found');
        }

        const isPaymentSuccessful = razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized';

        if (!isPaymentSuccessful) {
            await Subscription.findByIdAndDelete(subscription._id);
            throw new Error('payment_failed');
        }

        // Delete existing Free subscription BEFORE activating Premium
        await Subscription.deleteMany({ userId, plan: 'Free' });

        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

        subscription.status = 'active';
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.lastPaymentDate = startDate;
        subscription.nextBillingDate = endDate;
        subscription.autoRenew = true;
        await subscription.save();

        // Cancel pending cleanup job
        await cancelPendingSubscriptionCleanup(subscription._id.toString());

        // Create transaction record
        await Transaction.create({
            userId,
            transactionType: 'SUBSCRIPTION_PAYMENT',
            amount: razorpayPayment.amount / 100,
            currency: razorpayPayment.currency.toUpperCase(),
            status: 'SUCCESS',
            paymentMethod: 'razorpay',
            transactionId: razorpayPaymentId,
            subscriptionId: subscription._id
        });

        return subscription;
    };

    cancelPremiumSubscription = async (userId: string) => {
        // Find active Premium subscription
        const subscription = await Subscription.findOne({
            userId,
            plan: 'Premium',
            status: 'active'
        });

        if (!subscription) {
            throw new Error('no_active_premium_subscription');
        }

        // Cancel Razorpay subscription if exists
        if (subscription.razorpaySubscriptionId) {
            try {
                await this.razorpayService.cancelSubscription(subscription.razorpaySubscriptionId);
            } catch (error: any) {
                logger.error('[Subscription] Razorpay cancel error:', error.message);
            }
        }

        // Mark Premium as cancelled
        subscription.status = 'cancelled';
        subscription.autoRenew = false;
        await subscription.save();

        // Delete any existing Free subscriptions before creating new one
        await Subscription.deleteMany({ userId, plan: 'Free' });
        
        // Create Free subscription
        await Subscription.create({
            userId,
            plan: 'Free',
            status: 'active',
            startDate: new Date()
        });

        return subscription;
    };

    syncSubscriptionStatus = async (userId: string) => {
        // Find active or pending Premium subscription
        const subscription = await Subscription.findOne({ 
            userId, 
            plan: 'Premium', 
            status: { $in: ['active', 'pending'] } 
        }).sort({ createdAt: -1 });

        // If no Premium subscription, user is on Free plan
        if (!subscription) {
            const freeSubscription = await Subscription.findOne({ userId, plan: 'Free', status: 'active' });
            if (freeSubscription) {
                return {
                    subscription: freeSubscription,
                    message: 'User is on Free plan, no sync needed'
                };
            }
            throw new Error('subscription_not_found');
        }

        if (!subscription.razorpaySubscriptionId) {
            throw new Error('razorpay_subscription_id_missing');
        }

        // Fetch latest status from Razorpay
        const razorpaySubscription: any = await this.razorpayService.fetchSubscription(
            subscription.razorpaySubscriptionId
        );

        // Map Razorpay status to DB status
        const statusMap: any = {
            'created': 'pending',
            'authenticated': 'active',
            'active': 'active',
            'pending': 'pending',
            'halted': 'expired',
            'cancelled': 'cancelled',
            'completed': 'expired',
            'expired': 'expired'
        };

        const newStatus = statusMap[razorpaySubscription.status] || 'expired';
        const wasActive = subscription.status === 'active';
        const wasPending = subscription.status === 'pending';
        
        // If subscription becomes active from pending, delete Free subscriptions
        if (wasPending && newStatus === 'active') {
            await Subscription.deleteMany({ userId, plan: 'Free' });
        }
        
        subscription.status = newStatus;

        // Update subscription dates from Razorpay
        if (razorpaySubscription.current_start) {
            subscription.startDate = new Date(razorpaySubscription.current_start * 1000);
        }
        if (razorpaySubscription.current_end) {
            subscription.endDate = new Date(razorpaySubscription.current_end * 1000);
            subscription.nextBillingDate = new Date(razorpaySubscription.current_end * 1000);
        }
        if (razorpaySubscription.charge_at) {
            subscription.nextBillingDate = new Date(razorpaySubscription.charge_at * 1000);
        }

        await subscription.save();

        // If Premium expired/cancelled, create Free subscription
        if (wasActive && ['expired', 'cancelled'].includes(newStatus)) {
            const existingFree = await Subscription.findOne({ userId, plan: 'Free', status: 'active' });
            if (!existingFree) {
                await Subscription.create({
                    userId,
                    plan: 'Free',
                    status: 'active',
                    startDate: new Date()
                });
            }
        }

        return {
            subscription,
            razorpayStatus: razorpaySubscription.status,
            totalCount: razorpaySubscription.total_count,
            paidCount: razorpaySubscription.paid_count,
            remainingCount: razorpaySubscription.remaining_count
        };
    };

    getAvailablePlans = async () => {
        return await SubscriptionPlan.find({ isActive: true })
            .sort({ type: 1, price: 1 })
            .lean();
    };
}
