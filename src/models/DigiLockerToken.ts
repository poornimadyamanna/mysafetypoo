// src/models/DigiLockerToken.ts
import mongoose, { Schema, Document as MDoc } from "mongoose";

export interface IDigiLockerToken extends MDoc {
  userId: mongoose.Types.ObjectId;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: Date;
  consentValidTill?: Date | null;
}

const digiLockerTokenSchema = new Schema<IDigiLockerToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    accessTokenExpiresAt: { type: Date, required: true },
    consentValidTill: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

export const DigiLockerToken = mongoose.model<IDigiLockerToken>(
  "DigiLockerToken",
  digiLockerTokenSchema
);
