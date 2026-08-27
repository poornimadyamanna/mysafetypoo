import Queue from 'bull';
import { QR } from '../models/QR';
import { House } from '../models/House';
import { Subscription } from '../models/Subscription';
import logger from '../config/logger';


let qrExpiryQueue: Queue.Queue | null = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
        if (process.env.REDIS_URL) {
            qrExpiryQueue = new Queue('qr-expiry', process.env.REDIS_URL, {
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: false
                }
            });
        } else if (process.env.REDIS_HOST) {
            qrExpiryQueue = new Queue('qr-expiry', {
                redis: {
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD
                },
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: false
                }
            });
        }

        if (qrExpiryQueue) {
            qrExpiryQueue.on('error', () => {});

            qrExpiryQueue.process(async (job) => {
                const { qrId } = job.data;
                
                const qr = await QR.findById(qrId);
                if (!qr || qr.status !== 'ACTIVE') return;

                qr.status = 'EXPIRED';
                qr.isFrozen = true;
                await qr.save();

                if (qr.moduleType === 'DoorBell' && qr.ownerId) {
                    const subscription = await Subscription.findOne({ userId: qr.ownerId, status: 'active' });
                    if (subscription?.plan === 'Free') {
                        const houses = await House.find({ userId: qr.ownerId, qrId: qr._id });
                        for (const house of houses) {
                            if (house.memberIds.length > 0) {
                                house.frozenMemberIds = house.memberIds;
                                house.memberIds = [];
                                await house.save();
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        qrExpiryQueue = null;
    }
}

export { qrExpiryQueue };

export const scheduleQRExpiry = async (qrId: string, expiresAt: Date) => {
    if (!qrExpiryQueue) {
        logger.warn('[QR Expiry] Queue not available, skipping schedule');
        return;
    }
    
    const delay = expiresAt.getTime() - Date.now();
    if (delay > 0) {
        try {
            await qrExpiryQueue.add({ qrId }, { delay, jobId: qrId, removeOnComplete: true });
            logger.info(`[QR Expiry] Scheduled for ${qrId} at ${expiresAt}`);
        } catch (error) {
            logger.warn('[QR Expiry] Failed to schedule, queue unavailable');
        }
    }
};
