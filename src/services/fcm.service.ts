import { injectable } from 'tsyringe';
import admin from 'firebase-admin';
import logger from "../config/logger";
import { Device } from '../models/Device';

@injectable()
export class FCMService {
    constructor() {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FCM_PROJECT_ID,
                    clientEmail: process.env.FCM_CLIENT_EMAIL,
                    privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n')
                })
            });
        }
    }

    async sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
        try {
            const isCallNotification = data?.type === 'call_start';
            
            await admin.messaging().send({
                token,
                notification: { title, body },
                data,
                android: { 
                    priority: 'high' as const,
                    notification: {
                        channelId: isCallNotification ? 'call_channel' : 'default_channel'
                    }
                },
                apns: { 
                    payload: { 
                        aps: { 
                            sound: 'default',
                            contentAvailable: true,
                            ...(isCallNotification && { category: 'CALL_CATEGORY' })
                        } 
                    },
                    headers: {
                        'apns-priority': '10'
                    }
                }
            });
        } catch (error: any) {
            if (error?.code === 'messaging/registration-token-not-registered') {
                logger.warn('Invalid FCM token, should be removed from database:', token);
                await this.removeInvalidToken(token);
            } else {
                logger.error('FCM send error:', error);
            }
        }
    }

    async sendToMultiple(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
        if (!tokens.length) return;
        try {
            const isCallNotification = data?.type === 'call_start';
            
            const response = await admin.messaging().sendEachForMulticast({
                tokens,
                notification: { title, body },
                data,
                android: { 
                    priority: 'high' as const,
                    notification: {
                        channelId: isCallNotification ? 'call_channel' : 'default_channel'
                    }
                },
                apns: { 
                    payload: { 
                        aps: { 
                            sound: 'default',
                            contentAvailable: true,
                            ...(isCallNotification && { category: 'CALL_CATEGORY' })
                        } 
                    },
                    headers: {
                        'apns-priority': '10'
                    }
                }
            });
            
            if (response.failureCount > 0) {
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error as any;
                        if (error?.code === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(tokens[idx]);
                            logger.warn(`Invalid FCM token at index ${idx}, will be removed`);
                        } else {
                            logger.error(`FCM failed for token ${idx}:`, resp.error);
                        }
                    }
                });
                
                // Cleanup invalid tokens
                if (invalidTokens.length > 0) {
                    await this.removeInvalidTokens(invalidTokens);
                }
            }
        } catch (error) {
            logger.error('FCM multicast error:', error);
        }
    }

    private async removeInvalidToken(token: string): Promise<void> {
        try {
            // const { Device } = await import('../models/Device');
            await Device.updateMany({ fcmToken: token }, { isActive: false });
            logger.info('Deactivated invalid FCM token');
        } catch (error) {
            logger.error('Error removing invalid token:', error);
        }
    }

    private async removeInvalidTokens(tokens: string[]): Promise<void> {
        try {
            // const { Device } = await import('../models/Device');
            await Device.updateMany({ fcmToken: { $in: tokens } }, { isActive: false });
            logger.info(`Deactivated ${tokens.length} invalid FCM tokens`);
        } catch (error) {
            logger.error('Error removing invalid tokens:', error);
        }
    }
}
