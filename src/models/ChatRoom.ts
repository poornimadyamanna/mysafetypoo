import mongoose, { Schema, model } from "mongoose";

const chatRoomSchema = new Schema(
    {
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", required: true, index: true },
        moduleType: { type: String, enum: ["DoorBell", "Vehicle", "SmartCard", "LostFound"], required: true, index: true },
        moduleProfileId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // House/Vehicle/SmartCard/LostFound ID
        eventId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // DoorBellVisitEvent/VehicleAlertEvent/etc
        scannerId: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor", required: true, index: true },
        scannerType: { type: String, enum: ["Visitor", "User"], required: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        activeParticipantId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Owner or family member currently chatting
        activeParticipantType: { type: String, enum: ["Owner", "FamilyMember"] },
        status: { type: String, enum: ["Active", "Closed"], default: "Active", index: true },
        closedAt: { type: Date },
        lastMessageAt: { type: Date }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

chatRoomSchema.index({ status: 1, createdAt: -1 });
chatRoomSchema.index({ ownerId: 1, status: 1 });
chatRoomSchema.index({ qrId: 1, moduleType: 1 });

export const ChatRoom = model("ChatRoom", chatRoomSchema);
