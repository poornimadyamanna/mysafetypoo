import Queue from 'bull';
import { Subscription } from '../models/Subscription';

let subscriptionCleanupQueue: Queue.Queue | null = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
        if (process.env.REDIS_URL) {
            subscriptionCleanupQueue = new Queue('subscription-cleanup', process.env.REDIS_URL, {
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: false
                }
            });
        } else if (process.env.REDIS_HOST) {
            subscriptionCleanupQueue = new Queue('subscription-cleanup', {
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

        if (subscriptionCleanupQueue) {
            subscriptionCleanupQueue.on('error', () => {});

            subscriptionCleanupQueue.process(async (job) => {
                const { subscriptionId } = job.data;
                
                const subscription = await Subscription.findById(subscriptionId);
                
                if (subscription && subscription.status === 'pending') {
                    await Subscription.findByIdAndDelete(subscriptionId);
                }
            });
        }
    } catch (error) {
        subscriptionCleanupQueue = null;
    }
}

export { subscriptionCleanupQueue };

export const schedulePendingSubscriptionCleanup = async (subscriptionId: string) => {
    if (!subscriptionCleanupQueue) {
        return;
    }
    
    const CLEANUP_DELAY = 30 * 60 * 1000; // 30 minutes
    
    try {
        await subscriptionCleanupQueue.add(
            { subscriptionId }, 
            { delay: CLEANUP_DELAY, jobId: subscriptionId }
        );
    } catch (error) {
        // Silently ignore if queue is unavailable
    }
};

export const cancelPendingSubscriptionCleanup = async (subscriptionId: string) => {
    if (!subscriptionCleanupQueue) {
        return;
    }
    
    try {
        const job = await subscriptionCleanupQueue.getJob(subscriptionId);
        if (job) {
            await job.remove();
        }
    } catch (error) {
        // Silently ignore if job doesn't exist or queue is unavailable
    }
};
