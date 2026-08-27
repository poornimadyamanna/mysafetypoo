import mongoose, { Schema, model } from "mongoose";

const vehicleSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        vehicleNumber: { type: String, required: true, index: true },
        vehicleType: { type: String, enum: ["Car", "Bike", "Truck", "Bus", "Other"], required: true },
        brand: { type: String },
        model: { type: String },
        color: { type: String },
        vehicleImage: { type: String },
        chassisNumber: { type: String },
        ownerName: { type: String },
        ownerNumber: { type: String },
        issueDate: { type: String },
        vehicleClass: { type: String },
        fuel: { type: String },
        unldWt: { type: String },
        manufDate: { type: String },
        wheelbase: { type: String },
        seatCap: { type: String },
        regAuthority: { type: String },
        rcStatus: { type: String },
        rcExpiry: { type: String },
        underTheHood: {
            engineNo: { type: String },
            cylinder: { type: String },
            cc: { type: String },
            chassisNumber: { type: String }
        },
        insurance: {
            policyNo: { type: String },
            validTill: { type: String },
            companyName: { type: String },
            status: { type: String }
        },
        puc: {
            certificateNo: { type: String },
            emmisionNorm: { type: String },
            validTill: { type: String },
            status: { type: String }
        },
        isManualEntry: { type: Boolean, default: false },
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
        emergencyContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "VehicleEmergencyContact" }],
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", index: true },
        challanDetails: [
            {
                challanNo: { type: String },
                violatorName: { type: String },
                challanDate: { type: String },
                location: { type: String },
                violations: [
                    { type: String }
                ],
                amount: { type: Number },
                status: { type: String },
                rtoName: { type: String },
                paymentDate: { type: String },
                receiptNo: { type: String }
            }
        ]
    },
    { timestamps: true, versionKey: false }
);

vehicleSchema.index({ userId: 1, vehicleNumber: 1 });
vehicleSchema.index({ userId: 1, createdAt: -1 });
vehicleSchema.index({ vehicleNumber: 1, rcStatus: 1 });

export const Vehicle = model("Vehicle", vehicleSchema);
