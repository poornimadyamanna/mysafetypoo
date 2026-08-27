import { injectable } from "tsyringe";
import { Vehicle } from "../models/Vehicle";
import { VehicleEmergencyContact } from "../models/VehicleEmergencyContact";
import mongoose from "mongoose";

@injectable()
export class VehicleContactMappingService {
    async manageVehicleContacts(vehicleId: string, contactIds: string[], userId: string) {
        const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
        if (!vehicle) throw new Error("Vehicle not found");

        const contacts = await VehicleEmergencyContact.find({ _id: { $in: contactIds }, userId });
        if (contacts.length !== contactIds.length) throw new Error("Some contacts not found");

        vehicle.emergencyContacts = contactIds.map(id => new mongoose.Types.ObjectId(id));
        await vehicle.save();

        return await this.getVehicleContacts(vehicleId, userId);
    }

    async getVehicleContacts(vehicleId: string, userId: string) {
        const vehicle = await Vehicle.findOne({ _id: vehicleId, userId })
            .populate("emergencyContacts")
            .lean();
        
        if (!vehicle) throw new Error("Vehicle not found");

        return vehicle.emergencyContacts;
    }
}
