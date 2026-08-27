import { injectable } from "tsyringe";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { VehicleContactMappingService } from "../services/vehicle-contact-mapping.service";
import { successResponse, errorResponse } from "../utils/response";

@injectable()
export class VehicleContactMappingController {
    constructor(private service: VehicleContactMappingService) {}

    manageContacts = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId, contactIds } = req.body;
            const contacts = await this.service.manageVehicleContacts(vehicleId, contactIds, req.user._id);
            return successResponse(req, res, "contacts_updated", { contacts });
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    getVehicleContacts = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId } = req.body;
            const contacts = await this.service.getVehicleContacts(vehicleId as string, req.user._id);
            return successResponse(req, res, "vehicle_contacts_fetched", { contacts });
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
}
