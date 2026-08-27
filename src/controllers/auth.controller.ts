import { injectable } from "tsyringe";
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { successResponse, errorResponse } from "../utils/response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { getClientIp } from "../utils/getClientIp";
import logger from '../config/logger';

@injectable()
export class AuthController {
  constructor(private authService: AuthService) { }
  sendOtp = async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      const result = await this.authService.sendOtp(phone);
      // const message = await translate(req, "otp_sent");
      return successResponse(req, res, 'otp_sent', result);
    } catch (error: any) {
      logger.error("sendOtp Error:", error);
      // const message = await translate(req, "user_not_found");
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  verifyOtpAndLogin = async (req: Request, res: Response) => {
    try {
      const { phone, otp } = req.body;
      const ip = getClientIp(req);

      logger.info('Login attempt', { phone, ip });

      const result = await this.authService.verifyOtpAndLogin(phone, otp, ip);
      // const message = await translate(req, "login_success");
      return successResponse(req, res, 'login_success', result);
    } catch (error: any) {
      logger.error("verifyOtp Error:", error);
      // const message = await translate(req, error.message || "something_went_wrong");
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  googleSSO = async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      const ip = getClientIp(req);

      logger.info('Login attempt', { ip });
      if (!idToken) return errorResponse(req, res, 'missing_id_token', 400);
      const result = await this.authService.googleSSO(idToken, ip);
      // const message = await translate(req, "login_success");
      return successResponse(req, res, 'login_success', result);
    } catch (error: any) {
      logger.error("verifyOtp Error:", error);
      // const message = await translate(req, error.message || "something_went_wrong");
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  appleSSO = async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      const ip = getClientIp(req);

      logger.info('Apple login attempt', { ip });
      if (!idToken) return errorResponse(req, res, 'missing_id_token', 400);
      const result = await this.authService.appleSSO(idToken, ip);
      return successResponse(req, res, 'login_success', result);
    } catch (error: any) {
      logger.error("Apple SSO Error:", error);
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  refreshToken = async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")?.[1];
      const ip = getClientIp(req);

      logger.info('Login attempt', { ip });

      const result = await this.authService.refreshToken(token || '', ip);
      // const message = await translate(req, "token_refreshed");
      return successResponse(req, res, "token_refreshed", result);
    } catch (error: any) {
      logger.error("refreshToken Error:", error);
      // const message = await translate(req, error.key || "something_went_wrong");
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      await this.authService.logout(req.admin._id);
      // const message = await translate(req, "logout_success");
      // res.json({ success: true, message });
      return successResponse(req, res, 'logout_success');
    } catch (error: any) {
      // const message = await translate(req, "logout_failed");
      // res.status(500).json({ success: false, message, error: error.message });
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };


  adminLogin = async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      if (!idToken) return errorResponse(req, res, 'missing_id_token', 400);
      const ip = getClientIp(req);

      logger.info('Login attempt', { ip });
      const result = await this.authService.adminLogin(idToken, ip);
      return successResponse(req, res, "token_refreshed", result);
    } catch (error: any) {
      logger.error('Firebase auth error:', error);
      // res.status(401).json({ error: 'Invalid token' });
      return errorResponse(req, res, error.message || "something_went_wrong", 401);
    }
  };

}