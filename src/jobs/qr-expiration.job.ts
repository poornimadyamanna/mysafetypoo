import { QR } from '../models/QR';
import logger from '../config/logger';

export class QRExpirationJob {
    async checkExpiredQRs() {
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

            logger.info(`[QR Expiration Job] Processed ${result.modifiedCount} expired QRs`);
            return { processed: result.modifiedCount };
        } catch (error) {
            logger.error('[QR Expiration Job] Error:', error);
            throw error;
        }
    }

    start(intervalMinutes: number = 60) {
        logger.info(`[QR Expiration Job] Starting with ${intervalMinutes} minute interval`);
        
        this.checkExpiredQRs();
        
        setInterval(() => {
            this.checkExpiredQRs();
        }, intervalMinutes * 60 * 1000);
    }
}
