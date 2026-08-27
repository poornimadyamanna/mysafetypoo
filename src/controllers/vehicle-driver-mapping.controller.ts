import { injectable } from "tsyringe";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { VehicleDriverMappingService } from "../services/vehicle-driver-mapping.service";
import { successResponse, errorResponse } from "../utils/response";

@injectable()
export class VehicleDriverMappingController {
    constructor(private service: VehicleDriverMappingService) {}

    mapDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId, driverId } = req.body;
            const driver = await this.service.mapDriverToVehicle(vehicleId, driverId, req.user._id);
            return successResponse(req, res, "driver_mapped", { driver });
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    unmapDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId } = req.body;
            const result = await this.service.unmapDriverFromVehicle(vehicleId, req.user._id);
            return successResponse(req, res, "driver_unmapped", result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    getVehicleDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId } = req.body;
            const driver = await this.service.getVehicleDriver(vehicleId, req.user._id);
            return successResponse(req, res, "vehicle_driver_fetched", { driver });
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
}
