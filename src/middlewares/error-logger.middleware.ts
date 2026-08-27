import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Unhandled error: ${err.message}`, {
        method: req.method,
        url: req.originalUrl,
        stack: err.stack,
        body: req.body
    });
    
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
};
