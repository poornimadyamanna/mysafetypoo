import { Request, Response } from "express";
import { container } from "tsyringe";
import { DoorbellService } from "../services/doorbell.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";

export class DoorbellController {
  private doorbellService = container.resolve(DoorbellService);

  createHouse = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const houseData = req.body;

      const house = await this.doorbellService.createHouse(userId, houseData);

      return successResponse(req, res, 'house_created_successfully', house);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getHouses = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;

      const houses = await this.doorbellService.getHouses(userId);

      return successResponse(req, res, 'houses_retrieved', houses);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  updateHouse = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { houseId, ...updates } = req.body;

      const house = await this.doorbellService.updateHouse(houseId, userId, updates);

      return successResponse(req, res, 'house_updated_successfully', house);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  deleteHouse = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { houseId } = req.body;

      const result = await this.doorbellService.deleteHouse(houseId, userId);

      return successResponse(req, res, 'house_deleted_successfully', result);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  manageHouseMembers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { houseId, familyMemberIds } = req.body;

      const result = await this.doorbellService.manageHouseMembers(houseId, userId, familyMemberIds);

      return successResponse(req, res, 'house_members_updated_successfully', result);
    } catch (error: any) {
      // Handle limit exceeded error
      if (error.message.startsWith('family_member_limit_exceeded:')) {
        const limit = error.message.split(':')[1];
        return res.status(403).json({
          success: false,
          message: 'family_member_limit_exceeded',
          limit: parseInt(limit),
          upgrade: {
            message: 'Upgrade to Premium for unlimited family members',
            actions: {
              upgrade: '/api/user/subscription/upgrade',
              pricing: '/api/user/pricing'
            }
          }
        });
      }
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getHouseMembers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { houseId } = req.body;

      const members = await this.doorbellService.getHouseMembers(houseId, userId);

      return successResponse(req, res, 'house_members_retrieved', members);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  generateQRKit = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { houseId } = req.body;

      const qrKit = await this.doorbellService.generateQRKit(houseId, userId);

      return successResponse(req, res, 'qr_kit_generated', qrKit);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getVisits = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const visits = await this.doorbellService.getVisits(userId);
      return successResponse(req, res, 'visits_retrieved', visits);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  reassignFrozenMembers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { houseId, memberIds } = req.body;

      const result = await this.doorbellService.reassignFrozenMembers(houseId, userId, memberIds);

      return successResponse(req, res, 'frozen_members_reassigned', result);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };
}