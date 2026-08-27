import { Schema, model } from 'mongoose';

const ModuleMasterSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
}, { versionKey: false, timestamps: true });

export const ModuleMaster = model('ModuleMaster', ModuleMasterSchema);
