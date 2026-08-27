import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from "../config/logger";

export class RazorpayService {
    private razorpay: Razorpay;

    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!
        });
    }

    createOrder = async (amount: number, currency: string = 'INR', receipt: string) => {
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            receipt
        };

        const order = await this.razorpay.orders.create(options);
        return order;
    };

    verifyPayment = (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean => {
        const text = `${razorpayOrderId}|${razorpayPaymentId}`;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(text)
            .digest('hex');

        return generated_signature === razorpaySignature;
    };

    fetchPaymentStatus = async (razorpayPaymentId: string) => {
        const payment = await this.razorpay.payments.fetch(razorpayPaymentId);
        return payment;
    };

    fetchPaymentsByOrderId = async (razorpayOrderId: string) => {
        const payments = await this.razorpay.orders.fetchPayments(razorpayOrderId);
        return payments;
    };

    verifyWebhookSignature = (webhookBody: string, webhookSignature: string): boolean => {
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
            .update(webhookBody)
            .digest('hex');

        return generated_signature === webhookSignature;
    };

    refundPayment = async (razorpayPaymentId: string, amount?: number) => {
        const options: any = {};
        if (amount) {
            options.amount = amount * 100; // Convert to paise
        }
        const refund = await this.razorpay.payments.refund(razorpayPaymentId, options);
        return refund;
    };

    // Subscription methods
    createSubscription = async (planId: string, customerId: string, totalCount: number = 12) => {
        const subscription = await this.razorpay.subscriptions.create({
            plan_id: planId,
            customer_id: customerId,
            total_count: totalCount,
            quantity: 1,
            customer_notify: 1
        } as any);
        return subscription;
    };

    cancelSubscription = async (subscriptionId: string) => {
        const subscription = await this.razorpay.subscriptions.cancel(subscriptionId, true);
        return subscription;
    };

    fetchSubscription = async (subscriptionId: string) => {
        const subscription = await this.razorpay.subscriptions.fetch(subscriptionId);
        return subscription;
    };

    createCustomer = async (name: string, email: string, contact: string) => {
        // console.log(`[Razorpay] Creating customer - name: ${name}, email: ${email}, contact: ${contact}`);
        try {
            // Try fetching existing customer first
            const customers: any = await this.razorpay.customers.all({} as any);
            
            if (customers.items && customers.items.length > 0) {
                const existingCustomer = customers.items.find(
                    (c: any) => c.email === email || c.contact === contact
                );
                if (existingCustomer) {
                    return existingCustomer;
                }
            }
            
            // Create new customer if not found
            const customer = await this.razorpay.customers.create({
                name,
                email,
                contact
            });
            return customer;
        } catch (error: any) {
            throw error;
        }
    };

    // Plan management
    createPlan = async (name: string, amount: number, currency: string = 'INR', period: string = 'yearly', interval: number = 1) => {
        // console.log("name :" + name + ", amount : " + amount + ", currency : " + currency + ", period : " + period + ", interval : " + interval);

        try {
            const plan = await this.razorpay.plans.create({
                period,
                interval,
                item: {
                    name,
                    amount: amount * 100,
                    currency,
                    // description: `${name} subscription plan`
                }
            } as any);
            return plan;
        } catch (error) {
            logger.error(error)
        }
    };

    fetchPlan = async (planId: string) => {
        const plan = await this.razorpay.plans.fetch(planId);
        return plan;
    };
}
