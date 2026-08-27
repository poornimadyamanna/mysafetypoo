import { QR } from '../models/QR';
import { House } from '../models/House';
import { Subscription } from '../models/Subscription';
import { isUserInTrialPeriod } from '../utils/trialPeriod';
import logger from '../config/logger';

export class TrialExpiryJob {
    async freezeExcessMembers() {
        try {
            const now = new Date();
            
            // Find recently expired temporary QRs
            const expiredQRs = await QR.find({
                isTemporary: true,
                expiresAt: { $lte: now },
                status: 'EXPIRED',
                moduleType: 'DoorBell'
            }).select('ownerId');

            if (expiredQRs.length === 0) {
                logger.info('[Trial Expiry Job] No expired trials found');
                return { processed: 0 };
            }

            let processed = 0;

            for (const qr of expiredQRs) {
                if (!qr.ownerId) continue;
                
                const userId = qr.ownerId.toString();
                
                // Check if user still in trial (has another active temporary QR)
                const stillInTrial = await isUserInTrialPeriod(userId, 'DoorBell');
                if (stillInTrial) continue;

                // Check if user is Free
                const subscription = await Subscription.findOne({ userId, status: 'active' });
                if (subscription?.plan !== 'Free') continue;

                // Find houses with members
                const houses = await House.find({ userId, qrId: qr._id });

                for (const house of houses) {
                    if (house.memberIds.length > 0) {
                        // Freeze ALL members for Free users after trial
                        house.frozenMemberIds = house.memberIds;
                        house.memberIds = [];
                        await house.save();

                        processed++;
                        logger.info(`[Trial Expiry Job] Froze all ${house.frozenMemberIds.length} members for house ${house._id}`);
                    }
                }
            }

            logger.info(`[Trial Expiry Job] Processed ${processed} houses`);
            return { processed };
        } catch (error) {
            logger.error('[Trial Expiry Job] Error:', error);
            throw error;
        }
    }

    start(intervalMinutes: number = 60) {
        logger.info(`[Trial Expiry Job] Starting with ${intervalMinutes} minute interval`);
        
        this.freezeExcessMembers();
        
        setInterval(() => {
            this.freezeExcessMembers();
        }, intervalMinutes * 60 * 1000);
    }
}
