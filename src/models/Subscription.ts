import mongoose, { Schema, model } from 'mongoose';

const subscriptionSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        plan: { type: String, enum: ['Free', 'Premium'], default: 'Free', required: true },
        status: { type: String, enum: ['active', 'expired', 'cancelled', 'pending'], default: 'active' },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        autoRenew: { type: Boolean, default: false },
        paymentMethod: { type: String },
        razorpaySubscriptionId: { type: String },
        razorpayCustomerId: { type: String },
        lastPaymentDate: { type: Date },
        nextBillingDate: { type: Date },
        billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'yearly' }
    },
    { timestamps: true, versionKey: false }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, plan: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
subscriptionSchema.index({ nextBillingDate: 1, autoRenew: 1, status: 1 });

export const Subscription = model('Subscription', subscriptionSchema);
