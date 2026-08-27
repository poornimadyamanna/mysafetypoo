import mongoose from "mongoose";

const translationSchema = new mongoose.Schema({
  key: { type: String, required: true },
  translations: {
    en: { type: String },
    hi: { type: String },
    kn: { type: String },
    te: { type: String },
    ta: { type: String },
    bn: { type: String },
  }
}, { timestamps: true, versionKey: false });

translationSchema.index({ key: 1 }, { unique: true });

export const Translation = mongoose.model("Translation", translationSchema);