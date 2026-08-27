import mongoose, { Schema, model } from "mongoose";

const visitorSchema = new Schema(
    {
        name: { type: String, required: true },
        mobile: { type: String, required: true, unique: true },
        lang: { type: String, default: "en" },
        otpVerifiedAt: { type: Date },
        lastScanAt: { type: Date }
    },
    { timestamps: true, versionKey: false }
);

export const Visitor = model("Visitor", visitorSchema);
