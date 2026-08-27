import { QR } from '../models/QR';
import { House } from '../models/House';
import { Subscription } from '../models/Subscription';
import { isUserInTrialPeriod } from '../utils/trialPeriod';
import logger from '../config/logger';

export class QRMaintenanceJob {
    async expireQRs() {
        try {
            const now = new Date();
            
            const result = await QR.updateMany(
                {
                    isTemporary: true,
                    expiresAt: { $lte: now },
                    isFrozen: false,
                    status: 'ACTIVE'
                },
                {
                    $set: {
                        isFrozen: true,
                        status: 'EXPIRED'
                    }
                }
            );

            logger.info(`[QR Maintenance] Expired ${result.modifiedCount} QRs`);
            return { expired: result.modifiedCount };
        } catch (error) {
            logger.error('[QR Maintenance] Expire QRs error:', error);
            throw error;
        }
    }

    async freezeTrialMembers() {
        try {
            const now = new Date();
            
            const expiredQRs = await QR.find({
                isTemporary: true,
                expiresAt: { $lte: now },
                status: 'EXPIRED',
                moduleType: 'DoorBell'
            }).select('ownerId');

            if (expiredQRs.length === 0) {
                logger.info('[QR Maintenance] No expired trials found');
                return { frozen: 0 };
            }

            let frozen = 0;

            for (const qr of expiredQRs) {
                if (!qr.ownerId) continue;
                
                const userId = qr.ownerId.toString();
                
                const stillInTrial = await isUserInTrialPeriod(userId, 'DoorBell');
                if (stillInTrial) continue;

                const subscription = await Subscription.findOne({ userId, status: 'active' });
                if (subscription?.plan !== 'Free') continue;

                const houses = await House.find({ userId, qrId: qr._id });

                for (const house of houses) {
                    if (house.memberIds.length > 0) {
                        house.frozenMemberIds = house.memberIds;
                        house.memberIds = [];
                        await house.save();
                        frozen++;
                    }
                }
            }

            logger.info(`[QR Maintenance] Froze ${frozen} houses`);
            return { frozen };
        } catch (error) {
            logger.error('[QR Maintenance] Freeze members error:', error);
            throw error;
        }
    }

    async run() {
        logger.info('[QR Maintenance] Running maintenance tasks...');
        const expireResult = await this.expireQRs();
        const freezeResult = await this.freezeTrialMembers();
        logger.info(`[QR Maintenance] Completed: ${expireResult.expired} expired, ${freezeResult.frozen} frozen`);
    }

    start(intervalMinutes: number = 60) {
        logger.info(`[QR Maintenance] Starting with ${intervalMinutes} minute interval`);
        this.run();
        setInterval(() => this.run(), intervalMinutes * 60 * 1000);
    }
}
