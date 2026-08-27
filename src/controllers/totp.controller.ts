import { Request, Response } from 'express';
import { TOTPService } from '../services/totp.service';
import { User } from '../models/User';
import { errorResponse, successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import logger from "../config/logger";

export class TOTPController {
    static async setupTwoFactor(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.admin?._id;

            const user = await User.findById(userId);

            if (!user || user.role !== 'admin') {
                return await errorResponse(req, res, 'admin.unauthorized', 403);
            }

            if (user.twoFactorEnabled) {
                return await errorResponse(req, res, 'totp.already_enabled', 400);
            }

            const { secret, qrCode } = TOTPService.generateSecret(user.email || user.phone);

            user.twoFactorSecret = secret;
            await user.save();

            return await successResponse(req, res, 'totp.setup_initiated', { qrCode, secret });
        } catch (error) {
            logger.error('Setup 2FA Error:', error);
            return await errorResponse(req, res, 'server.error', 500);
        }
    }

    static async enableTwoFactor(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.admin?._id;
            const { token } = req.body;

            if (!token) {
                return await errorResponse(req, res, 'totp.token_required', 400);
            }

            const user = await User.findById(userId);

            if (!user || user.role !== 'admin') {
                return await errorResponse(req, res, 'admin.unauthorized', 403);
            }

            if (user.twoFactorEnabled) {
                return await errorResponse(req, res, 'totp.already_enabled', 400);
            }

            if (!user.twoFactorSecret) {
                return await errorResponse(req, res, 'totp.setup_required', 400);
            }

            const isValid = TOTPService.verifyToken(user.twoFactorSecret, token);

            if (!isValid) {
                return await errorResponse(req, res, 'totp.invalid_token', 400);
            }

            const backupCodes = TOTPService.generateBackupCodes();
            const hashedCodes = backupCodes.map(code => TOTPService.hashBackupCode(code));

            user.twoFactorEnabled = true;
            user.twoFactorBackupCodes = hashedCodes;
            await user.save();

            return await successResponse(req, res, 'totp.enabled', { backupCodes });
        } catch (error) {
            logger.error('Enable 2FA Error:', error);
            return await errorResponse(req, res, 'server.error', 500);
        }
    }

    static async disableTwoFactor(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.admin?._id;
            const { token } = req.body;

            if (!token) {
                return await errorResponse(req, res, 'totp.token_required', 400);
            }

            const user = await User.findById(userId);

            if (!user || user.role !== 'admin') {
                return await errorResponse(req, res, 'admin.unauthorized', 403);
            }

            // if (!user.twoFactorEnabled) {
            //     return await errorResponse(req, res, 'totp.not_enabled', 400);
            // }

            // const isValid = TOTPService.verifyToken(user.twoFactorSecret!, token);

            // if (!isValid) {
            //     return await errorResponse(req, res, 'totp.invalid_token', 400);
            // }

            user.twoFactorEnabled = false;
            user.twoFactorSecret = undefined;
            user.twoFactorBackupCodes = [];
            await user.save();

            return await successResponse(req, res, 'totp.disabled');
        } catch (error) {
            logger.error('Disable 2FA Error:', error);
            return await errorResponse(req, res, 'server.error', 500);
        }
    }

    static async verifyBackupCode(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.admin._id;
            const { code } = req.body;

            if (!code) {
                return await errorResponse(req, res, 'totp.code_required', 400);
            }

            const isValid = await TOTPService.verifyBackupCode(userId!, code);

            if (!isValid) {
                return await errorResponse(req, res, 'totp.invalid_backup_code', 400);
            }

            return await successResponse(req, res, 'totp.backup_code_verified');
        } catch (error) {
            logger.error('Verify Backup Code Error:', error);
            return await errorResponse(req, res, 'server.error', 500);
        }
    }

    static async getQRCode(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.admin._id;
            const user = await User.findById(userId);

            if (!user || user.role !== 'admin') {
                return await errorResponse(req, res, 'admin.unauthorized', 403);
            }

            if (!user.twoFactorEnabled || !user.twoFactorSecret) {
                return await errorResponse(req, res, 'totp.not_enabled', 400);
            }

            const qrCode = `otpauth://totp/MySafety%20(${encodeURIComponent(user.email || user.phone)})?secret=${user.twoFactorSecret}&issuer=MySafety`;

            return await successResponse(req, res, 'totp.qr_retrieved', { qrCode, secret: user.twoFactorSecret });
        } catch (error) {
            logger.error('Get QR Code Error:', error);
            return await errorResponse(req, res, 'server.error', 500);
        }
    }
}
