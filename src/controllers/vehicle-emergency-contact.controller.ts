import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { VehicleEmergencyContactService } from "../services/vehicle-emergency-contact.service";
import { successResponse, errorResponse } from "../utils/response";

@injectable()
export class VehicleEmergencyContactController {
    constructor(
       private service: VehicleEmergencyContactService
    ) {}

    getContacts = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId } = req.query;
            const contacts = await this.service.getContactsByVehicle(vehicleId as string, req.user._id);
            return successResponse(req, res, "contacts_fetched", { emergencyContacts: contacts });
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", error.message === "Vehicle not found" ? 404 : 400);
        }
    };

    addContact = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { vehicleId, name, email, mobile } = req.body;
            const contact = await this.service.createContact(vehicleId, req.user._id, name, email, mobile);
            return successResponse(req, res, "contact_added", { contact });
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", error.message === "Vehicle not found" ? 404 : 400);
        }
    };

    updateContact = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { contactId, name, email, mobile } = req.body;
            const contact = await this.service.updateContact(contactId, req.user._id, name, email, mobile);
            return successResponse(req, res, "contact_updated", { contact });
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", error.message === "Contact not found" ? 404 : 400);
        }
    };

    deleteContact = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { contactId } = req.body;
            await this.service.deleteContact(contactId as string, req.user._id);
            return successResponse(req, res, "contact_deleted", null);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", error.message === "Contact not found" ? 404 : 400);
        }
    };
}
