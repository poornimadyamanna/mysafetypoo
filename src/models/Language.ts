import { Schema, model } from "mongoose";

const LanguageSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true }, // e.g., "en", "hi", etc
    type: { type: String, enum: ["global", "local"], required: true }, // e.g., "global", "local"
    isActive: { type: Boolean, default: true }
}, { versionKey: false, });

export const Language = model("Language", LanguageSchema);
