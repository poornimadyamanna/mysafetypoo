import Queue from 'bull';
import { container } from 'tsyringe';
import { OrderService } from '../services/order.service';
import logger from '../config/logger';

let paymentTimeoutQueue: Queue.Queue | null = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
        if (process.env.REDIS_URL) {
            paymentTimeoutQueue = new Queue('payment-timeout', process.env.REDIS_URL, {
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: false
                }
            });
        } else if (process.env.REDIS_HOST) {
            paymentTimeoutQueue = new Queue('payment-timeout', {
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

        if (paymentTimeoutQueue) {
            paymentTimeoutQueue.on('error', () => {});

            paymentTimeoutQueue.process(async (job) => {
                const { orderId } = job.data;
                
                const orderService = container.resolve(OrderService);
                await orderService.cancelExpiredOrder(orderId);
            });
        }
    } catch (error) {
        paymentTimeoutQueue = null;
    }
}

export { paymentTimeoutQueue };

export const schedulePaymentTimeout = async (orderId: string, razorpayOrderCreatedAt: Date) => {
    if (!paymentTimeoutQueue) {
        logger.warn('[Payment Timeout] Queue not available, skipping schedule');
        return;
    }
    
    const PAYMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const expiryTime = new Date(razorpayOrderCreatedAt.getTime() + PAYMENT_TIMEOUT);
    const delay = expiryTime.getTime() - Date.now();
    
    if (delay > 0) {
        try {
            await paymentTimeoutQueue.add({ orderId }, { delay, jobId: orderId, removeOnComplete: true });
            logger.info(`[Payment Timeout] Scheduled for order ${orderId} at ${expiryTime}`);
        } catch (error) {
            logger.warn('[Payment Timeout] Failed to schedule, queue unavailable');
        }
    }
};
