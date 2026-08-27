import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { getClientIp } from '../utils/getClientIp';
import { BlockedIP } from '../models/BlockedIP';

const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

export const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    
    try {
        const blockedRecord = await BlockedIP.findOne({ ip });
        
        if (blockedRecord?.blockedUntil && blockedRecord.blockedUntil > new Date()) {
            logger.warn(`Blocked IP attempted access: ${ip}`);
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const originalSend = res.send;
        res.send = function(data: any) {
            if (res.statusCode >= 400) {
                trackFailedAttempt(ip).catch(err => logger.error('Failed to track attempt:', err));
            }
            return originalSend.call(this, data);
        };
    } catch (error) {
        logger.error('Security middleware error:', error);
    }
    
    next();
};

async function trackFailedAttempt(ip: string) {
    const now = new Date();
    const record = await BlockedIP.findOne({ ip });
    
    if (!record || now.getTime() - record.lastAttempt.getTime() > ATTEMPT_WINDOW) {
        await BlockedIP.findOneAndUpdate(
            { ip },
            { failedAttempts: 1, lastAttempt: now, blockedUntil: null },
            { upsert: true }
        );
    } else {
        record.failedAttempts++;
        record.lastAttempt = now;
        
        if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            record.blockedUntil = new Date(now.getTime() + BLOCK_DURATION);
            logger.error(`IP blocked due to suspicious activity: ${ip}`);
        }
        
        await record.save();
    }
}

// Cleanup expired blocks every hour
setInterval(async () => {
    try {
        await BlockedIP.deleteMany({
            blockedUntil: { $lt: new Date() },
            lastAttempt: { $lt: new Date(Date.now() - ATTEMPT_WINDOW) }
        });
    } catch (error) {
        logger.error('Cleanup error:', error);
    }
}, 60 * 60 * 1000);
