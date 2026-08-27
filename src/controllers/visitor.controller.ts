import { Request, Response } from "express";
import { container } from "tsyringe";
import { VisitorService } from "../services/visitor.service";
import { SMSService } from "../services/sms.service";
import { errorResponse, successResponse } from "../utils/response";

export class VisitorController {
    private visitorService = container.resolve(VisitorService);
    private smsService = container.resolve(SMSService);

    registerVisitor = async (req: Request, res: Response) => {
        try {
            const { name, mobile, lang, qrId } = req.body;
            
            if (!qrId) {
                return errorResponse(req, res, "qrId_required", 400);
            }
            
            // Check if visitor is blocked before allowing registration
            const qr = await this.visitorService.getQROwner(qrId);
            // console.log(qr);
            
            if (qr?.ownerId) {
                const isBlocked = await this.visitorService.checkIfBlocked(qr.ownerId.toString(), mobile);
                if (isBlocked) {
                    return res.status(403).json({
                        success: false,
                        message: "visitor_blocked_by_owner",
                        blocked: true
                    });
                }
            }

            const visitor = await this.visitorService.registerOrGetVisitor(name, mobile, lang);
            const otp = await this.visitorService.generateOTP(mobile);
            await this.smsService.sendOtpSMS(name, mobile, otp);

            return successResponse(req, res, "otp_sent", { visitorId: visitor._id });
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    verifyVisitorOTP = async (req: Request, res: Response) => {
        try {
            const { mobile, otp, qrId } = req.body;
            
            if (!qrId) {
                return errorResponse(req, res, "qrId_required", 400);
            }
            
            // Check if visitor is blocked before verifying OTP
            const qr = await this.visitorService.getQROwner(qrId);
            if (qr?.ownerId) {
                const isBlocked = await this.visitorService.checkIfBlocked(qr.ownerId.toString(), mobile);
                if (isBlocked) {
                    return res.status(403).json({
                        success: false,
                        message: "visitor_blocked_by_owner",
                        blocked: true
                    });
                }
            }

            const visitor = await this.visitorService.verifyOTP(mobile, otp);
            return successResponse(req, res, "otp_verified", visitor);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    callback = async (req: Request, res: Response) => {
        try {
            // const { mobile, otp } = req.body;
            // const visitor = await this.visitorService.verifyOTP(mobile, otp);

            return successResponse(req, res, "apisetu_callback", {});
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
}
