import mongoose, { Schema, model } from "mongoose";

const driverSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        phone: { type: String, required: true ,unique:true},
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
        licenseNumber: { type: String, required: true },
        licenseDocument: { type: String, required: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const Driver = model("Driver", driverSchema);