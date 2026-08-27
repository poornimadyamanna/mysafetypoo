import { injectable } from "tsyringe";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { DriverService } from "../services/driver.service";
import logger from "../config/logger";

@injectable()
export class DriverController {
    constructor(private driverService: DriverService) { }

    addDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const member = await this.driverService.addDriver(userId, updates);
            return successResponse(req, res, "driver_created", member);
        } catch (error: any) {
            logger.error("addDriver Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    getDrivers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const members = await this.driverService.getDrivers(userId);
            return successResponse(req, res, "driver_list", members);
        } catch (error: any) {
            logger.error("getDrivers Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    updateDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const members = await this.driverService.updateDriver(updates);
            return successResponse(req, res, "driver_updated", members);
        } catch (error: any) {
            logger.error("updateDriver Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    deleteDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // const userId = req.user._id;
            const { id } = req.body;
            const member = await this.driverService.deleteDriver(id);
            return successResponse(req, res, "driver_deleted", member);
        } catch (error: any) {
            logger.error("deleteDriver Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
}
