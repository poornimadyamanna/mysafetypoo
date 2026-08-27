import mongoose, { Schema, model } from "mongoose";

const vehicleAlertEventSchema = new Schema(
    {
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", required: true, index: true },
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        scannerId: { type: mongoose.Schema.Types.ObjectId },
        scannerType: { type: String, enum: ["User", "Visitor"], required: true },
        alertType: { type: String, enum: ["Accident", "ImproperParking", "General"]},
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        notes: { type: String },
        photos: [{ type: String }],
        status: { type: String, enum: ["Open", "Resolved"], default: "Open", index: true }
    },
    { timestamps: true, versionKey: false }
);

vehicleAlertEventSchema.index({ ownerId: 1, createdAt: -1 });
vehicleAlertEventSchema.index({ vehicleId: 1, status: 1 });

export const VehicleAlertEvent = model("VehicleAlertEvent", vehicleAlertEventSchema);
