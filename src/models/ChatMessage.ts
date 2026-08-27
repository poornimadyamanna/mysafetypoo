import mongoose, { Schema, model } from "mongoose";

const chatMessageSchema = new Schema(
    {
        roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true, index: true },
        senderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        senderType: { type: String, enum: ["Visitor", "User", "Owner", "FamilyMember"], required: true },
        messageType: { type: String, enum: ["Text", "Image", "Voice"], default: "Text" },
        content: { type: String }, // Text content or media URL
        mediaUrl: { type: String },
        mediaDuration: { type: Number }, // For voice notes in seconds
        status: { type: String, enum: ["Sent", "Delivered", "Seen"], default: "Sent", index: true },
        deliveredAt: { type: Date },
        seenAt: { type: Date }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ roomId: 1, status: 1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });

export const ChatMessage = model("ChatMessage", chatMessageSchema);
