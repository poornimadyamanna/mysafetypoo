import { Schema, model } from "mongoose";

const MessageTemplateSchema = new Schema({
    templateId: { type: String, required: true },
    msgType: { type: String, required: true }, // e.g., "en", "hi"
    isActive: { type: Boolean, default: true }
}, { versionKey: false, timestamps: true });

export const MessageTemplate = model("MessageTemplate", MessageTemplateSchema);
