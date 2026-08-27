import { Request, Response } from 'express';
import { RazorpayService } from '../services/razorpay.service';
import { Subscription } from '../models/Subscription';
import { Transaction } from '../models/Transaction';
import logger from "../config/logger";

export class RazorpayWebhookController {
    private razorpayService = new RazorpayService();

    handleWebhook = async (req: Request, res: Response) => {
        try {
            const signature = req.headers['x-razorpay-signature'] as string;
            const body = JSON.stringify(req.body);

            // Verify webhook signature
            const isValid = this.razorpayService.verifyWebhookSignature(body, signature);
            if (!isValid) {
                return res.status(400).json({ error: 'Invalid signature' });
            }

            const event = req.body.event;
            const payload = req.body.payload.subscription?.entity || req.body.payload.payment?.entity;

            switch (event) {
                case 'subscription.charged':
                    await this.handleSubscriptionCharged(payload);
                    break;
                case 'subscription.cancelled':
                    await this.handleSubscriptionCancelled(payload);
                    break;
                case 'subscription.completed':
                    await this.handleSubscriptionCompleted(payload);
                    break;
                case 'subscription.halted':
                    await this.handleSubscriptionHalted(payload);
                    break;
            }

            return res.status(200).json({ status: 'ok' });
        } catch (error) {
            logger.error('[Razorpay Webhook] Error:', error);
            return res.status(500).json({ error: 'Webhook processing failed' });
        }
    };

    private handleSubscriptionCharged = async (payload: any) => {
        const subscriptionId = payload.subscription_id;
        
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
        if (!subscription) return;

        // Create transaction record
        await Transaction.create({
            userId: subscription.userId,
            transactionType: 'SUBSCRIPTION_PAYMENT',
            amount: payload.amount / 100,
            currency: payload.currency,
            status: 'SUCCESS',
            paymentMethod: 'razorpay',
            transactionId: payload.id,
            subscriptionId: subscription._id
        });

        // Update subscription dates
        const nextBillingDate = new Date(subscription.nextBillingDate!);
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

        subscription.lastPaymentDate = new Date();
        subscription.nextBillingDate = nextBillingDate;
        subscription.endDate = nextBillingDate;
        subscription.status = 'active';
        await subscription.save();
    };

    private handleSubscriptionCancelled = async (payload: any) => {
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: payload.id });
        if (!subscription) return;

        subscription.status = 'cancelled';
        subscription.autoRenew = false;
        await subscription.save();

        // Create Free subscription instantly
        const existingFree = await Subscription.findOne({ userId: subscription.userId, plan: 'Free', status: 'active' });
        if (!existingFree) {
            await Subscription.create({
                userId: subscription.userId,
                plan: 'Free',
                status: 'active',
                startDate: new Date()
            });
        }
    };

    private handleSubscriptionCompleted = async (payload: any) => {
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: payload.id });
        if (!subscription) return;

        subscription.status = 'expired';
        subscription.autoRenew = false;
        await subscription.save();

        // Create Free subscription instantly
        const existingFree = await Subscription.findOne({ userId: subscription.userId, plan: 'Free', status: 'active' });
        if (!existingFree) {
            await Subscription.create({
                userId: subscription.userId,
                plan: 'Free',
                status: 'active',
                startDate: new Date()
            });
        }
    };

    private handleSubscriptionHalted = async (payload: any) => {
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: payload.id });
        if (!subscription) return;

        subscription.status = 'expired';
        await subscription.save();

        // Create Free subscription instantly
        const existingFree = await Subscription.findOne({ userId: subscription.userId, plan: 'Free', status: 'active' });
        if (!existingFree) {
            await Subscription.create({
                userId: subscription.userId,
                plan: 'Free',
                status: 'active',
                startDate: new Date()
            });
        }
    };
}
