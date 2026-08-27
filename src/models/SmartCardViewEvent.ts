import mongoose, { Schema, model } from "mongoose";

const smartCardViewEventSchema = new Schema(
    {
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", required: true, index: true },
        smartCardId: { type: mongoose.Schema.Types.ObjectId, ref: "SmartCard", required: true, index: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        scannerId: { type: mongoose.Schema.Types.ObjectId },
        scannerType: { type: String, enum: ["User", "Visitor"] },
        location: {
            latitude: { type: Number },
            longitude: { type: Number }
        },
        action: { type: String, enum: ["View", "Call", "Email", "SocialLink"] }
    },
    { timestamps: true, versionKey: false }
);

smartCardViewEventSchema.index({ ownerId: 1, smartCardId: 1 });
smartCardViewEventSchema.index({ smartCardId: 1, createdAt: -1 });

export const SmartCardViewEvent = model("SmartCardViewEvent", smartCardViewEventSchema);
