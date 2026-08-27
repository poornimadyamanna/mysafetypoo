import mongoose, { Schema, model } from "mongoose";

const audioRecordingsSchema = new Schema(
    {
        fileName: { type: String, required: true, index: true },
        code: { type: String },
        name: { type: String }
    },
    { timestamps: true, versionKey: false }
);

// audioRecordingsSchema.index({ ownerId: 1, phone: 1 }, { unique: true });

export const AudioRecording = model("AudioRecording", audioRecordingsSchema);