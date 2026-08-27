import mongoose, { Schema, model } from "mongoose";

const lostFoundEventSchema = new Schema(
    {
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", required: true, index: true },
        lostFoundId: { type: mongoose.Schema.Types.ObjectId, ref: "LostFound", required: true, index: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        scannerId: { type: mongoose.Schema.Types.ObjectId, refPath: 'scannerType' },
        scannerType: { type: String, enum: ["User", "Visitor"], required: true },
        message: { type: String },
        photos: [{ type: String }],
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        status: { type: String, enum: ["Reported", "InContact", "Recovered"], default: "Reported", index: true }
    },
    { timestamps: true, versionKey: false }
);

lostFoundEventSchema.index({ ownerId: 1, createdAt: -1 });
lostFoundEventSchema.index({ lostFoundId: 1, status: 1 });

export const LostFoundEvent = model("LostFoundEvent", lostFoundEventSchema);
