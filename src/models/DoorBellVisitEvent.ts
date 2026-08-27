import mongoose, { Schema, model } from "mongoose";

const doorBellVisitEventSchema = new Schema(
    {
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", required: true, index: true },
        houseId: { type: mongoose.Schema.Types.ObjectId, ref: "House", required: true, index: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        scannerId: { type: mongoose.Schema.Types.ObjectId },
        scannerType: { type: String, enum: ["User", "Visitor"], required: true },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        purpose: { type: String },
        note: { type: String },
        videoCallSessionId: { type: String },
        status: { type: String, enum: ["Pending", "Answered", "Missed"], default: "Pending", index: true }
    },
    { timestamps: true, versionKey: false }
);

doorBellVisitEventSchema.index({ ownerId: 1, createdAt: -1 });
doorBellVisitEventSchema.index({ houseId: 1, status: 1 });

export const DoorBellVisitEvent = model("DoorBellVisitEvent", doorBellVisitEventSchema);
