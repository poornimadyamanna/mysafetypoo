import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { TOTPService } from '../services/totp.service';
import { errorResponse } from '../utils/response';
import { AuthenticatedRequest } from './auth.middleware';
import logger from "../config/logger";

export const verifyTOTP = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.admin?.userId;
        const totpCode = req.headers['x-totp-code'] as string;

        const user = await User.findOne({ userId });

        if (!user || user.role !== 'admin') {
            return await errorResponse(req, res, 'admin.unauthorized', 403);
        }

        if (!user.twoFactorEnabled) {
            return next();
        }

        if (!user.twoFactorSecret) {
            return await errorResponse(req, res, 'totp.setup_required', 400);
        }

        if (!totpCode) {
            return await errorResponse(req, res, 'totp.code_required', 400);
        }

        const isValid = TOTPService.verifyToken(user.twoFactorSecret!, totpCode);

        if (!isValid) {
            const isBackupValid = await TOTPService.verifyBackupCode(user._id.toString(), totpCode);
            if (!isBackupValid) {
                return await errorResponse(req, res, 'totp.invalid_token', 401);
            }
        }

        next();
    } catch (error) {
        logger.error('TOTP Verification Error:', error);
        return await errorResponse(req, res, 'server.error', 500);
    }
};
