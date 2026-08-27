import { Schema, model } from 'mongoose';

const DeviceSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fcmToken: { type: String, required: true },
    deviceId: { type: String, required: true },
    platform: { type: String, enum: ['android', 'ios', 'web'], required: true },
    deviceName: { type: String },
    appVersion: { type: String },
    isActive: { type: Boolean, default: true },
    lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false });

DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const Device = model('Device', DeviceSchema);
