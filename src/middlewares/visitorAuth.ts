import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from './auth.middleware';

export const authenticateVisitor = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const jwtSecret = process.env.ACCESS_TOKEN_SECRET || 'mysafety-secret-key-2024';
        const decoded: any = jwt.verify(token, jwtSecret);

        if (decoded.userType !== 'Visitor') {
            return res.status(403).json({ success: false, message: 'Invalid visitor token' });
        }

        req.visitor = {
            visitorId: decoded.visitorId,
            userId: decoded.userId,
            mobile: decoded.mobile
        };

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
