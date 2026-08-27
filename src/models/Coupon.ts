// models/coupon.ts
import mongoose from 'mongoose';

const CouponRuleSchema = new mongoose.Schema({
    minAmount: { type: Number, required: true },
    bonusAmount: { type: Number, required: true },
});

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    rules: [CouponRuleSchema],
    isActive: { type: Boolean, default: true },
    validTill: { type: Date, required: true },
    maxUsagePerUser: { type: Number, default: 1 },
    eligibleUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // optional targeting
}, { timestamps: true, versionKey: false });

export const Coupon = mongoose.model('Coupon', CouponSchema);
