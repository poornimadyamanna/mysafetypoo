import { Request, Response } from "express";
import { container } from "tsyringe";
import { AdminService } from "../services/admin.service";
import { errorResponse, successResponse } from "../utils/response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export class AdminController {
  private adminService = container.resolve(AdminService);

  getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, size = 10, sortBy = 'createdAt', sortType = 'desc', search = '' } = req.body;
      
      const result = await this.adminService.getAllUsers(page, size, sortBy, sortType, search);
      return successResponse(req, res, 'all_users', result);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getUserById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.body;
      const user = await this.adminService.getUserById(userId);
      return successResponse(req, res, 'user_details', user);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  updateUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.body;
      const updates = req.body;

      const user = await this.adminService.updateUser(userId, updates);

      return successResponse(req, res, 'user_updated', user);
    } catch (error: any) {

      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  toggleUserStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, isActive } = req.body;

      const user = await this.adminService.toggleUserStatus(userId, isActive);

      return successResponse(req, res, isActive ? 'user_activated' : 'user_deactivated', user);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };
}