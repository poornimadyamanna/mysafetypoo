import mongoose, { Schema, model } from 'mongoose';

const cartItemSchema = new Schema({
    moduleType: { type: String, enum: ['Vehicle', 'DoorBell', 'SmartCard', 'LostFound'], required: true },
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const cartSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        items: [cartItemSchema],
        orderType: { type: String, enum: ['PURCHASE', 'DOWNLOAD'], default: 'PURCHASE', required: true }
    },
    { timestamps: true, versionKey: false }
);

cartSchema.index({ userId: 1, orderType: 1 }, { unique: true });

export const Cart = model('Cart', cartSchema);
