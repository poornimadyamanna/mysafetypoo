import Bull from 'bull';
import { Subscription } from '../models/Subscription';
import { SubscriptionService } from '../services/subscription.service';
import logger from '../config/logger';

let subscriptionSyncQueue: Bull.Queue | null = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
        if (process.env.REDIS_URL) {
            subscriptionSyncQueue = new Bull('subscription-sync', process.env.REDIS_URL);
        } else if (process.env.REDIS_HOST) {
            subscriptionSyncQueue = new Bull('subscription-sync', {
                redis: {
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD
                }
            });
        }

        if (subscriptionSyncQueue) {
            subscriptionSyncQueue.on('error', () => {});

            const subscriptionService = new SubscriptionService();

            subscriptionSyncQueue.process(async (job) => {
                try {
                    const subscriptions = await Subscription.find({
                        plan: 'Premium',
                        status: { $in: ['active', 'pending'] },
                        razorpaySubscriptionId: { $exists: true, $ne: null }
                    }).select('userId razorpaySubscriptionId');

                    for (const subscription of subscriptions) {
                        try {
                            await subscriptionService.syncSubscriptionStatus(subscription.userId.toString());
                        } catch (error: any) {
                            logger.error(`[Subscription Sync] Error syncing ${subscription._id}:`, error.message);
                        }
                    }
                } catch (error) {
                    logger.error('[Subscription Sync] Error:', error);
                }
            });

            subscriptionSyncQueue.add({}, { repeat: { cron: '0 */6 * * *' } }).catch(() => {});
            logger.info('[Subscription Sync Queue] Initialized');
        }
    } catch (error) {
        subscriptionSyncQueue = null;
    }
} else {
    logger.warn('[Subscription Sync Queue] Disabled - Redis not configured');
}

export { subscriptionSyncQueue };
