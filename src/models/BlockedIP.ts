import { Schema, model } from "mongoose";

const blockedIPSchema = new Schema(
    {
        ip: { type: String, required: true, unique: true, index: true },
        failedAttempts: { type: Number, default: 1 },
        lastAttempt: { type: Date, default: Date.now },
        blockedUntil: { type: Date, index: true }
    },
    { timestamps: true, versionKey: false }
);

export const BlockedIP = model("BlockedIP", blockedIPSchema);
