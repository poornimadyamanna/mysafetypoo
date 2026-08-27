import { Request } from 'express';

export const getClientIp = (req: Request): string => {
    let ip = req.ip || 
             req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
             req.headers['x-real-ip']?.toString() || 
             req.socket.remoteAddress || 
             'unknown';
    
    // Convert IPv6 localhost to IPv4
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }
    
    // Remove IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    
    return ip;
};
