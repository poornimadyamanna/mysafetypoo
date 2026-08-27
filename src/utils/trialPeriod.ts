import { QR } from '../models/QR';

/**
 * Check if user has active trial period (temporary QR that hasn't expired)
 * Trial period = User has active temporary QR (24 hours from creation)
 * During trial, user gets Premium features regardless of subscription plan
 */
export const isUserInTrialPeriod = async (userId: string, moduleType?: string): Promise<boolean> => {
    const query: any = {
        ownerId: userId,
        isTemporary: true,
        status: 'ACTIVE',
        isFrozen: false,
        expiresAt: { $gt: new Date() }
    };

    if (moduleType) {
        query.moduleType = moduleType;
    }

    const activeTemporaryQR = await QR.findOne(query);
    return !!activeTemporaryQR;
};

/**
 * Get user's active temporary QR if in trial period
 */
export const getUserTrialQR = async (userId: string, moduleType?: string) => {
    const query: any = {
        ownerId: userId,
        isTemporary: true,
        status: 'ACTIVE',
        isFrozen: false,
        expiresAt: { $gt: new Date() }
    };

    if (moduleType) {
        query.moduleType = moduleType;
    }

    return await QR.findOne(query);
};
