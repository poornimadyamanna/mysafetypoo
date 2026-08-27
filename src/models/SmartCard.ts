import mongoose, { Schema, model } from "mongoose";

const SocialLinksSchema = new Schema({
    type: { type: mongoose.Schema.Types.ObjectId, ref: "SmartCardLinkMaster" },
    link: { type: String },
    isActive: { type: Boolean, default: true }
}, { _id: false });

const smartCardSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        displayName: { type: String, required: true },
        businessName: { type: String },
        siteUrl: { type: String },
        siteName: { type: String },
        bio: { type: String },
        profilePhotoUrl: { type: String },
        resumeUrl: { type: String },
        activeSocialLinks: [SocialLinksSchema],
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", index: true }
    },
    { timestamps: true, versionKey: false }
);

export const SmartCard = model("SmartCard", smartCardSchema);
