import { Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AgoraCallService } from '../services/agora-call.service';
import { successResponse, errorResponse } from '../utils/response';
import { startCallSchema, joinCallSchema, generateTokenSchema } from '../validators/agora-call.validator';

@injectable()
export class AgoraCallController {
    constructor(
        @inject(AgoraCallService) private agoraCallService: AgoraCallService
    ) { }

    startCall = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const validation = startCallSchema.safeParse(req.body);
            if (!validation.success) return errorResponse(req, res, 'invalid_input', 400);

            const { qrId, callType } = validation.data;
            const result = await this.agoraCallService.startCall(qrId, callType);

            return successResponse(req, res, 'call_started', result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    joinCall = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id || null;
            const callId = req.params.callId as string;
            if (!callId) return errorResponse(req, res, 'call_id_required', 400);

            const validation = joinCallSchema.safeParse(req.body);
            if (!validation.success) return errorResponse(req, res, 'invalid_input', 400);

            const { role, visitorId } = validation.data;
            const result = await this.agoraCallService.joinCall(callId, userId, role, visitorId || null);

            return successResponse(req, res, 'joined_call', result);
        } catch (error: any) {
            if (error.message === 'CALL_TIME_OVER') {
                return res.status(403).json({ success: false, message: 'Call time limit reached', code: 'CALL_TIME_OVER' });
            }
            if (error.message === 'MAX_PARTICIPANTS_REACHED') {
                return res.status(403).json({ success: false, message: 'Maximum participants reached', code: 'MAX_PARTICIPANTS_REACHED' });
            }
            if (error.message === 'FAMILY_JOIN_REQUIRES_PREMIUM') {
                return res.status(403).json({ success: false, message: 'Family members can only join with Premium subscription', code: 'FAMILY_JOIN_REQUIRES_PREMIUM' });
            }
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    generateToken = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?._id?.toString() || null;

            const callId = req.params.callId as string;
            if (!callId) return errorResponse(req, res, 'call_id_required', 400);

            const validation = generateTokenSchema.safeParse(req.body);
            if (!validation.success) return errorResponse(req, res, 'invalid_input', 400);

            const { role, visitorId } = validation.data;
            const result = await this.agoraCallService.generateToken(callId, userId, visitorId || null, role);

            return successResponse(req, res, 'token_generated', result);
        } catch (error: any) {
            if (error.message === 'CALL_TIME_OVER') {
                return res.status(403).json({ success: false, message: 'Call time limit reached', code: 'CALL_TIME_OVER' });
            }
            if (error.message === 'PARTICIPANT_NOT_FOUND') {
                return res.status(404).json({ success: false, message: 'You must join the call first before requesting a token', code: 'PARTICIPANT_NOT_FOUND' });
            }
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    endCall = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const callId = req.params.callId as string;
            if (!callId) return errorResponse(req, res, 'call_id_required', 400);
            const { role } = req.body;

            const result = await this.agoraCallService.endCall(callId,role);

            return successResponse(req, res, 'call_ended', result);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };
}
