import mongoose, { Schema, model } from "mongoose";

const blockedVisitorSchema = new Schema(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        phone: { type: String, required: true, index: true },
        reason: { type: String },
        blockedAt: { type: Date, default: Date.now }
    },
    { timestamps: true, versionKey: false }
);

blockedVisitorSchema.index({ ownerId: 1, phone: 1 }, { unique: true });

export const BlockedVisitor = model("BlockedVisitor", blockedVisitorSchema);
