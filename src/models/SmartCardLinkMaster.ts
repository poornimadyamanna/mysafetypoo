import { Schema, model } from "mongoose";

const smartCardLinkMasterSchema = new Schema(
    {
        webSiteName: { type: String, required: true, unique: true },
        isActive: { type: Boolean, default: true },
        type: { type: String, enum: ['social', 'professional'] },
        logoUrl: { type: String }
    },
    { timestamps: true, versionKey: false }
);

export const SmartCardLinkMaster = model("SmartCardLinkMaster", smartCardLinkMasterSchema);
