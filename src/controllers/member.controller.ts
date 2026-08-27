import { injectable } from "tsyringe";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { MemberService } from "../services/member.service";
import logger from "../config/logger";

@injectable()
export class MemberController {
    constructor(private memberService: MemberService) { }

    addMember = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { phone } = req.body;
            const member = await this.memberService.addMember(userId, phone);
            return successResponse(req, res, "member_created", member);
        } catch (error: any) {
            logger.error("addMember Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    getMembers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const updates = req.body;
            const members = await this.memberService.getMember(userId);
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
            const members = await this.memberService.updateMember(userId, updates);
            return successResponse(req, res, "member_updated", members);
        } catch (error: any) {
            logger.error("updateMember Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };
    deleteMember = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // const userId = req.user._id;
            const { id } = req.body;
            const member = await this.memberService.deleteMember(id);
            return successResponse(req, res, "member_deleted", member);
        } catch (error: any) {
            logger.error("deleteMember Error:", error);
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

}
