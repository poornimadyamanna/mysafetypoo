import mongoose, { Schema, model } from 'mongoose';

const FamilyMemberSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    // moduleType: { type: String, enum: ["Vehicle", "DoorBell", "SmartCard", "LostFound"], required: true },
    // phone: { type: String, required: true },
}, { timestamps: true, versionKey: false });

FamilyMemberSchema.index({ userId: 1, memberId: 1 }, { unique: true });

export const FamilyMember = model('FamilyMember', FamilyMemberSchema);
