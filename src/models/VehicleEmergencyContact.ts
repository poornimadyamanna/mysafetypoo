import mongoose, { Schema, model } from "mongoose";

const vehicleEmergencyContactSchema = new Schema(
    {
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true },
        email: { type: String },
        mobile: { type: String, required: true }
    },
    { timestamps: true, versionKey: false }
);

vehicleEmergencyContactSchema.index({ vehicleId: 1, userId: 1 });

export const VehicleEmergencyContact = model("VehicleEmergencyContact", vehicleEmergencyContactSchema);
