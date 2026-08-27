import mongoose, { Schema, model } from "mongoose";

const lostFoundSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        itemName: { type: String, required: true },
        itemDescription: { type: String },
        itemPhoto: { type: String },
        category: { type: String, enum: ["Bag", "Laptop", "Phone", "Keys", "Wallet", "Other"] },
        contactPreference: { type: String, enum: ["Call", "SMS", "Both"], default: "Both" },
        // alternateContact: { type: String },
        status: { type: String, enum: ["Active", "Recovered", "Lost"], default: "Active", index: true },
        qrId: { type: mongoose.Schema.Types.ObjectId, ref: "QR", index: true },
        memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }],
        frozenMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }]
    },
    { timestamps: true, versionKey: false }
);

export const LostFound = model("LostFound", lostFoundSchema);
