import mongoose, { Schema, model } from "mongoose";

const houseSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        houseName: { type: String, required: true },
        houseNumber: { type: String },
        apartment: { type: String },
        fullAddressUrl: { type: String, required: true },
        latitude: { type: Number },
        longitude: { type: Number },
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", index: true },
        memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }],
        frozenMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }]
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const House = model("House", houseSchema);