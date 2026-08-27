import { injectable } from "tsyringe";
import { VehicleEmergencyContact } from "../models/VehicleEmergencyContact";
import { Vehicle } from "../models/Vehicle";

@injectable()
export class VehicleEmergencyContactService {
    async getContactsByVehicle(vehicleId: string, userId: string) {
        if (vehicleId) {
            const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
            if (!vehicle) throw new Error("Vehicle not found");
            return await VehicleEmergencyContact.find({ vehicleId, userId }).lean();
        }

        return await VehicleEmergencyContact.find({ userId }).lean();
    }

    async createContact(vehicleId: string, userId: string, name: string, email: string, mobile: string) {
        if (vehicleId) {
            const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
            if (!vehicle) throw new Error("Vehicle not found");
        }

        return await VehicleEmergencyContact.create({ vehicleId, userId, name, email, mobile });
    }

    async updateContact(contactId: string, userId: string, name: string, email: string, mobile: string) {
        const contact = await VehicleEmergencyContact.findOneAndUpdate(
            { _id: contactId, userId },
            { name, email, mobile },
            { new: true }
        );

        if (!contact) throw new Error("Contact not found");
        return contact;
    }

    async deleteContact(contactId: string, userId: string) {
        const contact = await VehicleEmergencyContact.findOneAndDelete({ _id: contactId, userId });
        if (!contact) throw new Error("Contact not found");
        return contact;
    }
}
