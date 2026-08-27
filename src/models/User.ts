import { Schema, model } from 'mongoose';


const AddressSchema = new Schema({
    fulladdress: { type: String, required: false },
    pincode: { type: String, required: false },
    landmark: { type: String, required: false },
    mapUrl: { type: String, required: false },
}, { _id: false });

const UserSchema = new Schema({
    userId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    // phoneChangeCount: { type: Number, default: 2 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    email: { type: String, required: false },
    pendingEmail: { type: String, required: false },
    emailVerificationToken: { type: String, required: false },
    emailVerified: { type: Boolean, default: false },
    displayName: { type: String, required: false },
    dob: { type: Date, required: false },
    avatarUrl: { type: String, default: '' },
    lang: {
        type: String,
        enum: ['en', 'ar', 'hi', 'kn', 'te', 'ta', 'bn', 'mr', 'od'],
        default: 'en'
    },
    isActive: { type: Boolean, default: true },
    // isVerified: { type: Boolean, default: false },
    isExisting: { type: Boolean, default: false },
    address: { type: AddressSchema, required: false },
    // emergencyContact: { type: [EmergencyContactSchema], required: false, default: [] }
    twoFactorSecret: { type: String, required: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorBackupCodes: { type: [String], default: [] },
    fcmToken: { type: String, required: false },
}, { timestamps: true, versionKey: false });

export const User = model('User', UserSchema);
