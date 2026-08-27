import mongoose, { Schema, model } from "mongoose";

const callSessionSchema = new Schema(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        qrId: { type: String, required: true, index: true },
        moduleType: { type: String, enum: ["DoorBell", "Vehicle", "SmartCard", "LostFound"], required: true },
        moduleId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        sessionId: { type: String, required: true, unique: true },
        callType: { type: String, enum: ["video", "audio"], required: true },
        ownerPlan: { type: String, enum: ["Free", "Premium"], required: true },
        maxParticipants: { type: Number, required: true },
        participants: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            visitorId: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor" },
            role: { type: String, enum: ["owner", "visitor", "family"] },
            uid: { type: Number },
            joinedAt: { type: Date }
        }],
        startTime: { type: Date, required: true },
        endTime: { type: Date },
        durationSeconds: { type: Number, default: 0 },
        status: { type: String, enum: ["active", "completed", "failed"], default: "active" },
        channelName: { type: String, required: true },
        startedAt: { type: Date, required: true },
        endsAt: { type: Date, required: true },
        maxDurationSeconds: { type: Number, required: true }
    },
    { timestamps: true, versionKey: false }
);

callSessionSchema.index({ ownerId: 1, createdAt: -1 });
callSessionSchema.index({ channelName: 1 });
callSessionSchema.index({ status: 1, endsAt: 1 });
callSessionSchema.index({ moduleId: 1, moduleType: 1, status: 1 });

export const CallSession = model("CallSession", callSessionSchema);

export type CallSessionStatus = "active" | "completed" | "failed";
export type AgoraCallStatus = "ACTIVE" | "ENDED";
