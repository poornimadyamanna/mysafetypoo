import { Response } from 'express';
import { CallService } from '../services/call.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { errorResponse, successResponse } from '../utils/response';
import { injectable } from 'tsyringe';
@injectable()
export class CallController {
    private callService = new CallService();

    startCall = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { moduleType, sessionId, callType } = req.body;

            // Check duration limit before starting
            const limitCheck = await this.callService.checkCallDurationLimit(userId, moduleType, callType);

            if (!limitCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    message: 'call_duration_limit_reached',
                    limit: limitCheck.limit,
                    remainingSeconds: limitCheck.remainingSeconds,
                    upgrade: {
                        message: 'Upgrade to Premium for unlimited call duration',
                        actions: {
                            upgrade: '/api/user/subscription/upgrade',
                            pricing: '/api/user/pricing'
                        }
                    }
                });
            }

            const session = await this.callService.startCall(userId, moduleType, sessionId, callType);

            return successResponse(req, res, 'call_started', {
                sessionId: session.sessionId,
                remainingSeconds: limitCheck.remainingSeconds
            });
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    endCall = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { sessionId } = req.body;

            const result = await this.callService.endCall(sessionId);

            return successResponse(req, res, 'call_ended', result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getUsage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { moduleType } = req.query;

            const usage = await this.callService.getMonthlyUsage(userId, moduleType as string);

            return successResponse(req, res, 'usage_retrieved', usage);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getModuleCalls = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            
            const { moduleType, profileId } = req.body;

            const calls = await this.callService.getModuleCalls(userId, moduleType, profileId);

            return successResponse(req, res, 'calls_retrieved', { calls });
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getModuleChatRooms = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { moduleType, profileId } = req.body;

            const chatRooms = await this.callService.getModuleChatRooms(userId, moduleType, profileId);

            return successResponse(req, res, 'chat_rooms_retrieved', { chatRooms });
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getChatMessages = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            const { roomId, page = 1, limit = 50 } = req.body;

            const result = await this.callService.getChatMessages(userId, roomId, page, limit);

            return successResponse(req, res, 'messages_retrieved', result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };
}
