import { injectable } from "tsyringe";
import { Driver } from "../models/Driver";
import logger from "../config/logger";

@injectable()
export class DriverService {

    addDriver = async (userId: string, updates: any) => {

        try {
            const driver = await Driver.create({
                userId,
                name: updates.name,
                phone: updates.phone,
                vehicleId: updates.vehicleId,
                licenseNumber: updates.licenseNumber,
                licenseDocument: updates.licenseDocument
            });
            if (!driver) throw new Error("driver_add_failed");

            return {
                _id: driver._id,
                name: driver.name,
                phone: driver.phone,
                vehicleId: driver.vehicleId,
                licenseNumber: driver.licenseNumber,
                licenseDocument: driver.licenseDocument
            };
        } catch (err: any) {
            logger.error("addDriver Error:", err);
            throw new Error(err.message);
        }
    };
    getDrivers = async (userId: string) => {

        try {
            const drivers = await Driver.aggregate([
                { $match: { userId } },
                {
                    $lookup: {
                        from: "vehicles",
                        localField: "vehicleId",
                        foreignField: "_id",
                        as: "vehicleDetails",
                        pipeline: [{ $project: { _id: 1, name: 1, model: 1, plateNumber: 1 } }]
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        phone: 1,
                        vehicleDetails: { $arrayElemAt: ["$vehicleDetails", 0] },
                        licenseNumber: 1,
                        licenseDocument: 1
                    }
                }
            ]);

            return drivers;
        } catch (err) {
            logger.error("getDrivers Error:", err);
            throw new Error("driver_get_failed");
        }
    };
    updateDriver = async (updates: any) => {

        try {
            const driver = await Driver.findByIdAndUpdate(updates.id, updates, { new: true }).lean();
            if (!driver) throw new Error("driver_not_found");

            return {
                _id: driver._id,
                name: driver.name,
                phone: driver.phone,
                vehicleId: driver.vehicleId,
                licenseNumber: driver.licenseNumber,
                licenseDocument: driver.licenseDocument
            };
        } catch (err: any) {
            logger.error("updateDriver Error:", err);
            throw new Error("driver_update_failed");
        }
    };
    deleteDriver = async (id: string) => {

        try {
            const driver = await Driver.findByIdAndDelete(id).lean();
            if (!driver) throw new Error("driver_not_found");

            return { deletedId: id };
        } catch (err) {
            logger.error("deleteDriver Error:", err);
            throw new Error("driver_delete_failed");
        }
    };

}
