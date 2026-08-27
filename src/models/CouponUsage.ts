// models/couponUsage.ts
import mongoose from 'mongoose';

const CouponUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  usageCount: { type: Number, default: 1 },
},{timestamps:true, versionKey: false});

CouponUsageSchema.index({ userId: 1, couponId: 1 }, { unique: true });

export const CouponUsage = mongoose.model('CouponUsage', CouponUsageSchema);
