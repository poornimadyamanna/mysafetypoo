import mongoose, { Schema, model } from 'mongoose';

const addressSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        house: { type: String },
        street: { type: String, },
        city: { type: String, },
        state: { type: String, },
        zipCode: { type: String, },
        country: { type: String, default: 'India' },
        fullAddress: { type: String },
        fullMapUrl: { type: String },
        longitude: { type: Number },
        latitude: { type: Number },
        isDefault: { type: Boolean, default: false }
    },
    { timestamps: true, versionKey: false }
);

addressSchema.index({ userId: 1, isDefault: 1 });

export const Address = model('Address', addressSchema);
