import { injectable } from "tsyringe";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { UserService } from "../services/user.service";
import { readFileSync } from "node:fs";
import path from "node:path";
import logger from "../config/logger";

@injectable()
export class UserController {
    constructor(private userService: UserService) { }

    getProfile = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const user = await this.userService.getUserProfile(userId);
            return successResponse(req, res, "profile_fetched", user);
        } catch (error: any) {
            logger.error("getProfile Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    updateProfile = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const updatedUser = await this.userService.updateUserProfile(userId, updates);
            req.user.lang = updatedUser.lang;
            return successResponse(req, res, "profile_updated", updatedUser);
        } catch (error: any) {
            logger.error("updateProfile Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    updateEmailRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const result = await this.userService.updateUserEmail(userId, updates, req.user.lang);
            return successResponse(req, res, result.message, result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    // verifyEmail = async (req: AuthenticatedRequest, res: Response) => {
    //     try {
    //         const token = req.query.token as string;
    //         const result = await this.userService.verifyEmailByToken(token);
    //         //  return res.redirect(process.env.REDIRECT_APP_URL);
    //         return successResponse(req, res, result.message, result);
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message || "something_went_wrong", 400);
    //     }
    // };

    verifyEmail = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const token = req.query.token as string;
            const user = await this.userService.verifyEmailByToken(token);

            if (!user) {
                const invalidHTML = readFileSync(
                    path.join(__dirname, '../../templates/email-invalid.html'),
                    'utf-8'
                );
                return res.status(400).send(invalidHTML);
            }

            const successHTML = readFileSync(
                path.join(__dirname, '../../templates/email-verified.html'),
                'utf-8'
            );
            return res.send(successHTML);

            // 📌 Later: Redirect to your Flutter app like this:
            // return res.redirect(`myapp://email-verified`);
        } catch (error) {
            logger.error("verifyEmail error:", error);
            const errorHTML = readFileSync(
                path.join(__dirname, '../../templates/email-error.html'),
                'utf-8'
            );
            return res.status(500).send(errorHTML);
        }
    };


    addMember = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { phone } = req.body;
            const member = await this.userService.addMember(userId, phone);
            return successResponse(req, res, "member_created", member);
        } catch (error: any) {
            logger.error("updateProfile Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    getMembers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const members = await this.userService.getMember(userId);
            return successResponse(req, res, "member_list", members);
        } catch (error: any) {
            logger.error("getMembers Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    updateMember = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const members = await this.userService.updateMember(userId, updates);
            return successResponse(req, res, "member_updated", members);
        } catch (error: any) {
            logger.error("getMembers Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    deleteMember = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // const userId = req.user._id;
            const { id } = req.body;
            const member = await this.userService.deleteMember(id);
            return successResponse(req, res, "member_deleted", member);
        } catch (error: any) {
            logger.error("getMembers Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    addDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const member = await this.userService.addDriver(userId, updates);
            return successResponse(req, res, "driver_created", member);
        } catch (error: any) {
            logger.error("updateProfile Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    getDrivers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const members = await this.userService.getDrivers(userId);
            return successResponse(req, res, "driver_list", members);
        } catch (error: any) {
            logger.error("getMembers Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    updateDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const members = await this.userService.updateDriver(updates);
            return successResponse(req, res, "driver_updated", members);
        } catch (error: any) {
            logger.error("getMembers Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    deleteDriver = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // const userId = req.user._id;
            const { id } = req.body;
            const member = await this.userService.deleteDriver(id);
            return successResponse(req, res, "driver_deleted", member);
        } catch (error: any) {
            logger.error("getMembers Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
}
