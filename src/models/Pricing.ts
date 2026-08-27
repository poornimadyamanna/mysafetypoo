import mongoose, { Schema, model } from "mongoose";

const bulkDiscountSchema = new Schema({
    minQuantity: { type: Number, required: true },
    maxQuantity: { type: Number },
    discountPercentage: { type: Number, required: true }
}, { _id: false });

const pricingSchema = new Schema(
    {
        moduleType: { type: String, enum: ["Vehicle", "DoorBell", "SmartCard", "LostFound"], required: true, unique: true },
        basePrice: { type: Number, required: true },
        downloadPrice: { type: Number, required: true },
        bulkDiscounts: [bulkDiscountSchema],
        inventoryImage: { type: String, required: false },
        moduleImage: { type: String, required: false },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true, versionKey: false }
);

pricingSchema.index({ moduleType: 1, isActive: 1 });

export const Pricing = model("Pricing", pricingSchema);
