import mongoose, { Schema, model } from "mongoose";

const documentSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentCategory", required: true },
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
        vehicleNumber: { type: String },
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        mimeType: { type: String, required: true },
        uploadMethod: { 
            type: String, 
            enum: ["camera", "gallery", "digilocker"], 
            default: "gallery" 
        },
        isLinkedToDigiLocker: { type: Boolean, default: false },
        expiryDate: { type: Date },
        tags: [{ type: String }],
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

documentSchema.index({ userId: 1, categoryId: 1, isActive: 1 });
documentSchema.index({ userId: 1, vehicleId: 1, categoryId: 1, isActive: 1 });
documentSchema.index({ userId: 1, isActive: 1 });

export const Document = model("Document", documentSchema);