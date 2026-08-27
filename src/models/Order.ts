import mongoose, { Schema, model } from "mongoose";

const orderItemSchema = new Schema({
    moduleType: { type: String, enum: ["DoorBell", "Vehicle", "SmartCard", "LostFound"], required: true },
    quantity: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    qrIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "QR" }]
}, { _id: false });

const orderSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        orderNumber: { type: String, required: true, unique: true, index: true },
        items: [orderItemSchema],
        subtotal: { type: Number, required: true },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        orderType: { type: String, enum: ["PURCHASE", "DOWNLOAD", "REORDER"], default: "PURCHASE" },
        paymentStatus: { type: String, enum: ["Pending", "Completed", "Failed", "Refunded"], default: "Pending", index: true },
        paymentMethod: { type: String },
        transactionId: { type: String },
        razorpayOrderId: { type: String },
        orderStatus: { type: String, enum: ["Pending", "Processing", "Completed", "Cancelled"], default: "Pending", index: true },
        addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" }
    },
    { timestamps: true, versionKey: false }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1 });

export const Order = model("Order", orderSchema);
