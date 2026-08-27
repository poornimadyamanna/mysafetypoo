import mongoose, { Schema, model } from "mongoose";

const scanEventSchema = new Schema(
    {
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", required: true, index: true },
        scannerId: { type: mongoose.Schema.Types.ObjectId },
        scannerType: { type: String, enum: ["User", "Visitor"], required: true },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        moduleType: { type: String, enum: ["Vehicle", "DoorBell", "SmartCard", "LostFound"], index: true }
    },
    { timestamps: true, versionKey: false }
);

scanEventSchema.index({ qrId: 1, createdAt: -1 });
scanEventSchema.index({ moduleType: 1, createdAt: -1 });

export const ScanEvent = model("ScanEvent", scanEventSchema);
