import mongoose, { Schema, model } from "mongoose";

const predefinedMessageSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        moduleType: { type: String, enum: ["Vehicle", "LostFound"], default: "Vehicle", required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
        audioId: { type: mongoose.Schema.Types.ObjectId, ref: "AudioRecording" },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);


export const PredefinedMessage = model("PredefinedMessage", predefinedMessageSchema);