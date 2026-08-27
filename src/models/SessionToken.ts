import { Schema, model } from 'mongoose';

const SessionTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  accessToken: String,
  refreshToken: String,
  expiresAt: Date,
  deviceInfo: String,
  ip: String
}, { timestamps: true,versionKey: false });

export const SessionToken = model('SessionToken', SessionTokenSchema);
