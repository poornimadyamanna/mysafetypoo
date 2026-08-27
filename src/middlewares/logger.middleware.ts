import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
        
        if (res.statusCode >= 400) {
            logger.error(logMessage);
        } else {
            logger.info(logMessage);
        }
    });
    
    next();
};
