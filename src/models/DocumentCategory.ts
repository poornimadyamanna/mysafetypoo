import mongoose, { Schema, model } from "mongoose";

const documentCategorySchema = new Schema(
    {
        categoryName: { type: String, required: true, unique: true },
        displayName: { type: String, required: true },
        allowMultiple: { type: Boolean, default: false },
        isVehicleDocument: { type: Boolean, default: false },
        hasExpiry: { type: Boolean, default: false },
        description: { type: String },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

documentCategorySchema.index({ categoryName: 1, isActive: 1 });

export const DocumentCategory = model("DocumentCategory", documentCategorySchema);
