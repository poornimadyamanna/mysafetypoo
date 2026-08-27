import { injectable } from 'tsyringe';
import { Device } from '../models/Device';

@injectable()
export class DeviceTokenService {
    async registerDevice(userId: string, deviceData: { fcmToken: string; deviceId: string; platform: string; deviceName?: string; appVersion?: string }) {
        // Deactivate all other devices for this user (single device policy)
        await Device.updateMany({ userId }, { isActive: false });
        
        return Device.findOneAndUpdate(
            { userId, deviceId: deviceData.deviceId },
            { ...deviceData, userId, isActive: true, lastActiveAt: new Date() },
            { upsert: true, new: true }
        ).select('-__v');
    }

    async removeDevice(userId: string) {
        return Device.updateMany({ userId }, { isActive: false });
    }

    async getActiveTokensByUserIds(userIds: string[]) {
        const devices = await Device.find({ userId: { $in: userIds }, isActive: true }).select('fcmToken').lean();
        return devices.map(d => d.fcmToken).filter(Boolean) as string[];
    }
}
