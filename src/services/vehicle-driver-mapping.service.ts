import { injectable } from "tsyringe";
import { Vehicle } from "../models/Vehicle";
import { Driver } from "../models/Driver";

@injectable()
export class VehicleDriverMappingService {
    async mapDriverToVehicle(vehicleId: string, driverId: string, userId: string) {
        const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
        if (!vehicle) throw new Error("Vehicle not found");

        const driver = await Driver.findOne({ _id: driverId, userId });
        if (!driver) throw new Error("Driver not found");

        // Check if driver is already assigned to another vehicle
        if (driver.vehicleId && driver.vehicleId.toString() != vehicleId) {
            throw new Error("Driver already assigned to another vehicle");
        }

        // Check if vehicle already has a driver
        if (vehicle.driverId && vehicle.driverId.toString() !== driverId) {
            // Unmap previous driver
            await Driver.findByIdAndUpdate(vehicle.driverId, { vehicleId: null });
        }

        // Map driver to vehicle
        vehicle.driverId = driver._id;
        driver.vehicleId = vehicle._id;

        await vehicle.save();
        await driver.save();

        return await this.getVehicleDriver(vehicleId, userId);
    }

    async unmapDriverFromVehicle(vehicleId: string, userId: string) {
        const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
        if (!vehicle) throw new Error("Vehicle not found");

        if (vehicle.driverId) {
            await Driver.findByIdAndUpdate(vehicle.driverId, { vehicleId: null });
            vehicle.driverId = undefined;
            await vehicle.save();
        }

        return { message: "Driver unmapped successfully" };
    }

    async getVehicleDriver(vehicleId: string, userId: string) {
        const vehicle = await Vehicle.findOne({ _id: vehicleId, userId })
            .populate("driverId")
            .lean();
        
        if (!vehicle) throw new Error("Vehicle not found");

        return vehicle.driverId || null;
    }
}
