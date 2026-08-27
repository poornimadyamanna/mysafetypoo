import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
    name: string;
    type: 'Free' | 'Premium';
    price: number;
    currency: string;
    razorpayPlanId: string;
    features: {
        moduleType: string;
        featureName: string;
        featureKey: string;
        isAvailable: boolean;
        links: string[];
        limit: number | null;
    }[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>({
    name: { type: String, required: true },
    type: { type: String, enum: ['Free', 'Premium'], required: true },
    price: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },
    razorpayPlanId: { type: String },
    features: [{
        moduleType: { type: String, required: true },
        featureName: { type: String, required: true },
        featureKey: { type: String, required: true },
        isAvailable: { type: Boolean, default: false },
        links: [{ type: String }],
        limit: { type: Number, default: null }
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
