import { Schema, model } from 'mongoose';

const OtpSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
    otp: { type: String, required: true },
    validUpto: { type: Date, required: true },
    // createdAt: { type: Date, default: Date.now },
    triesLeft: { type: Number, default: 3 }, // starts at 3
}, { versionKey: false, timestamps: true });

export const Otp = model('Otp', OtpSchema);
