import { injectable } from 'tsyringe';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { successResponse, errorResponse } from '../utils/response';
import { DeviceTokenService } from '../services/devicetoken.service';

@injectable()
export class DeviceTokenController {
    constructor(private deviceTokenService: DeviceTokenService) {}

    registerDevice = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { fcmToken, deviceId, platform, deviceName, appVersion } = req.body;
            
            if (!fcmToken || !deviceId || !platform) {
                return errorResponse(req, res, 'fcmToken, deviceId, and platform are required', 400);
            }

            const device = await this.deviceTokenService.registerDevice(userId, { fcmToken, deviceId, platform, deviceName, appVersion });
            return successResponse(req, res, 'device_registered', device);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    removeDevice = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            await this.deviceTokenService.removeDevice(userId);
            return successResponse(req, res, 'device_removed', null);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };
}
