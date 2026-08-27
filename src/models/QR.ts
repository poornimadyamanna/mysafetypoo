import mongoose, { Schema, model } from "mongoose";

const qrSchema = new Schema(
    {
        qrId: { type: String, required: true, unique: true },
        qrType: { type: String, enum: ["Temporary", "Physical"], required: true, index: true, default: "Physical" },
        status: { type: String, enum: ["CREATED", "ORDERED", "DELIVERED", "ACTIVE", "SUSPENDED", "EXPIRED"], default: "CREATED", index: true },
        batchInfo: { type: String },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        moduleType: { type: String, enum: ["Vehicle", "DoorBell", "SmartCard", "LostFound"], required: true },
        moduleProfileId: { type: mongoose.Schema.Types.ObjectId },
        assignedAt: { type: Date },
        planAtActivation: { type: String, enum: ["Free", "Premium"] },
        isTemporary: { type: Boolean, default: false },
        expiresAt: { type: Date },
        isFrozen: { type: Boolean, default: false },
        lastScannedAt: { type: Date },
        scanCount: { type: Number, default: 0 }
    },
    { timestamps: true, versionKey: false }
);

qrSchema.index({ status: 1, qrType: 1, createdAt: -1 });
qrSchema.index({ qrId: 1, status: 1 });
qrSchema.index({ status: 1, moduleType: 1, qrType: 1 });
qrSchema.index({ batchInfo: 1, createdAt: -1 });

export const QR = model("QR", qrSchema);
