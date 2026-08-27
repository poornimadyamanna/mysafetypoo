import Bull from 'bull';
import { Subscription } from '../models/Subscription';
import logger from '../config/logger';

let subscriptionRenewalQueue: Bull.Queue | null = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
        if (process.env.REDIS_URL) {
            subscriptionRenewalQueue = new Bull('subscription-renewal', process.env.REDIS_URL);
        } else if (process.env.REDIS_HOST) {
            subscriptionRenewalQueue = new Bull('subscription-renewal', {
                redis: {
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD
                }
            });
        }

        if (subscriptionRenewalQueue) {
            subscriptionRenewalQueue.on('error', () => {});

            subscriptionRenewalQueue.process(async (job) => {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    const subscriptions = await Subscription.find({
                        status: 'active',
                        autoRenew: true,
                        nextBillingDate: { $gte: today, $lt: tomorrow }
                    }).populate('userId');

                    for (const subscription of subscriptions) {
                        try {
                            if (!subscription.nextBillingDate) continue;
                            
                            const nextBillingDate = new Date(subscription.nextBillingDate);
                            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
                            
                            subscription.nextBillingDate = nextBillingDate;
                            subscription.endDate = nextBillingDate;
                            await subscription.save();
                        } catch (error) {
                            logger.error(`[Subscription Renewal] Error renewing subscription ${subscription._id}:`, error);
                        }
                    }
                } catch (error) {
                    logger.error('[Subscription Renewal] Error:', error);
                }
            });

            subscriptionRenewalQueue.add({}, { repeat: { cron: '0 2 * * *' } }).catch(() => {});
            logger.info('[Subscription Renewal Queue] Initialized');
        }
    } catch (error) {
        subscriptionRenewalQueue = null;
    }
} else {
    logger.warn('[Subscription Renewal Queue] Disabled - Redis not configured');
}

export { subscriptionRenewalQueue };
