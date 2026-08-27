import { injectable, inject } from 'tsyringe';
import { CallSession } from '../models/CallSession';
import { Subscription } from '../models/Subscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { QR } from '../models/QR';
import { FamilyMember } from '../models/FamilyMember';
import { AgoraService } from './agora.service';
import { NotificationService } from './notification.service';
import { BlockedVisitorService } from './blockedvisitor.service';
import logger from "../config/logger";

type UserPlan = 'Free' | 'Premium';

interface StartCallResponse {
    callId: string;
    channelName: string;
    maxDurationSeconds: number;
    maxParticipants: number;
    endsAt: Date;
}

interface JoinCallResponse {
    agoraToken: string;
    appId: string;
    channelName: string;
    uid: number;
    expiresAt: Date;
}

@injectable()
export class AgoraCallService {
    constructor(
        @inject(AgoraService) private agoraService: AgoraService,
        @inject(NotificationService) private notificationService: NotificationService,
        @inject(BlockedVisitorService) private blockedVisitorService: BlockedVisitorService
    ) { }

    async startCall(qrId: string, callType: 'video' | 'audio' = 'video'): Promise<StartCallResponse> {
        const qr = await QR.findOne({ qrId, status: 'ACTIVE' });
        if (!qr || !qr.ownerId || !qr.moduleProfileId) throw new Error('QR_NOT_FOUND');

        const userPlan = await this.getUserPlan(qr.ownerId.toString());
        const isTrialQR = qr.qrType === 'Temporary' && !qr.isFrozen;
        const effectivePlan = isTrialQR ? 'Premium' : userPlan;

        const maxDurationSeconds = await this.getCallDurationLimit(effectivePlan, qr.moduleType!, callType);
        const maxParticipants = effectivePlan === 'Premium' ? 10 : 2;

        const callId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        const channelName = `call_${qr.moduleType}_${qr.moduleProfileId}_${callId}`;
        const startedAt = new Date();
        const endsAt = new Date(startedAt.getTime() + maxDurationSeconds * 1000);

        const session = await CallSession.create({
            ownerId: qr.ownerId,
            qrId,
            moduleType: qr.moduleType,
            moduleId: qr.moduleProfileId,
            sessionId: callId,
            callType,
            ownerPlan: effectivePlan,
            maxParticipants,
            participants: [],
            startedAt,
            endsAt,
            maxDurationSeconds,
            status: 'active',
            startTime: startedAt,
            channelName
        });



        // Notify participants in chat room
        await this.notificationService.notifyCallStarted(qr._id.toString(), callId, channelName, callType).catch(err =>
            logger.error('Notification error:', err)
        );

        return {
            callId: session.sessionId,
            channelName: session.channelName,
            maxDurationSeconds: session.maxDurationSeconds,
            maxParticipants: session.maxParticipants,
            endsAt: session.endsAt
        };
    }

    async joinCall(callId: string, userId: string | null, role: 'owner' | 'visitor' | 'family', visitorId: string | null): Promise<JoinCallResponse> {
        const session = await CallSession.findOne({ sessionId: callId });
        if (!session) throw new Error('CALL_SESSION_NOT_FOUND');
        if (session.status !== 'active') throw new Error('CALL_NOT_ACTIVE');

        const now = new Date();
        if (now > session.endsAt) throw new Error('CALL_TIME_OVER');

        // Check if visitor is blocked
        if (role === 'visitor' && visitorId) {
            const isBlocked = await this.blockedVisitorService.isVisitorBlocked(session.ownerId.toString(), visitorId);
            if (isBlocked) throw new Error('VISITOR_BLOCKED');
        }

        if (role === 'owner') {
            if (!userId) throw new Error('OWNER_REQUIRES_AUTH');
            if (session.ownerId.toString() !== userId.toString()) throw new Error('NOT_OWNER');
        }

        if (role === 'family') {
            if (!userId) throw new Error('FAMILY_REQUIRES_AUTH');
            const isFamilyMember = await FamilyMember.exists({ userId: session.ownerId, memberId: userId });
            if (!isFamilyMember) throw new Error('NOT_FAMILY_MEMBER');
            if (session.ownerPlan === 'Free') throw new Error('FAMILY_JOIN_REQUIRES_PREMIUM');
        }

        if (session.participants.length >= session.maxParticipants) throw new Error('MAX_PARTICIPANTS_REACHED');

        const existingParticipant = session.participants.find(p =>
            (userId && p.userId?.toString() == userId.toString()) || (visitorId && p.visitorId?.toString() == visitorId.toString())
        );
        if (existingParticipant) {
            return this.generateTokenForParticipant(session, existingParticipant.uid!, 'subscriber');
        }

        const uid = this.generateNumericUid();
        session.participants.push({
            userId: userId as any,
            visitorId: visitorId as any,
            role,
            uid,
            joinedAt: now
        });
        await session.save();

        const response = await this.generateTokenForParticipant(session, uid, 'publisher');

        return response;
    }

    async generateToken(
        callId: string,
        userId: string | null,
        visitorId: string | null,
        role: 'publisher' | 'subscriber'
    ): Promise<JoinCallResponse> {
        const session = await CallSession.findOne({ sessionId: callId });
        if (!session) throw new Error('CALL_SESSION_NOT_FOUND');
        if (session.status !== 'active') throw new Error('CALL_NOT_ACTIVE');

        const participant = session.participants.find(p =>
            (userId && p.userId?.toString() == userId) || (visitorId && p.visitorId?.toString() == visitorId)
        );
        if (!participant) throw new Error('PARTICIPANT_NOT_FOUND');

        const now = new Date();
        const remainingSeconds = Math.floor((session.endsAt.getTime() - now.getTime()) / 1000);

        if (remainingSeconds <= 0) throw new Error('CALL_TIME_OVER');

        const defaultTTL = this.agoraService.getDefaultTokenExpire();
        const tokenExpiry = Math.min(defaultTTL, remainingSeconds);

        const agoraToken = this.agoraService.generateRtcToken(
            session.channelName,
            participant.uid!,
            role,
            tokenExpiry
        );

        const expiresAt = new Date(now.getTime() + tokenExpiry * 1000);

        return {
            agoraToken,
            appId: this.agoraService.getAppId(),
            channelName: session.channelName,
            uid: participant.uid!,
            expiresAt
        };
    }

    async endCall(callId: string, role: 'owner' | 'visitor' | 'family', userId?: string): Promise<{ callId: string; durationSeconds: number }> {
        const session = await CallSession.findOne({ sessionId: callId, status: 'active' });
        if (!session) throw new Error('CALL_SESSION_NOT_FOUND');

        const endTime = new Date();
        const durationSeconds = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);

        // Only visitor can end the entire session
        if (role === 'visitor' || session.participants.length == 2) {
            session.endTime = endTime;
            session.durationSeconds = durationSeconds;
            session.status = 'completed';
            await session.save();
        } else {
            // Owner or family member leaving - remove from participants but keep session active
            if (userId) {
                const participantIndex = session.participants.findIndex(
                    p => p.userId?.toString() === userId.toString()
                );
                if (participantIndex !== -1) {
                    session.participants.splice(participantIndex, 1);
                    await session.save();
                }
            }
        }

        // Get QR ObjectId for notification
        const qr = await QR.findOne({ qrId: session.qrId }).select('_id').lean();
        if (qr) {
            await this.notificationService.notifyCallEnded(qr._id.toString(), callId, durationSeconds, role).catch(err =>
                logger.error('Notification error:', err)
            );
        }

        return { callId, durationSeconds };
    }

    private async generateTokenForParticipant(session: any, uid: number, role: 'publisher' | 'subscriber'): Promise<JoinCallResponse> {
        const now = new Date();
        const remainingSeconds = Math.floor((session.endsAt.getTime() - now.getTime()) / 1000);
        const defaultTTL = this.agoraService.getDefaultTokenExpire();
        const tokenExpiry = Math.min(defaultTTL, remainingSeconds);

        const agoraToken = this.agoraService.generateRtcToken(session.channelName, uid, role, tokenExpiry);
        const expiresAt = new Date(now.getTime() + tokenExpiry * 1000);

        return {
            agoraToken,
            appId: this.agoraService.getAppId(),
            channelName: session.channelName,
            uid,
            expiresAt
        };
    }

    private async getUserPlan(userId: string): Promise<UserPlan> {
        const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
        return (subscription?.plan as UserPlan) || 'Free';
    }

    private async getCallDurationLimit(planType: UserPlan, moduleType: string, callType: 'video' | 'audio'): Promise<number> {
        const featureKey = callType === 'video' ? 'video_call_duration' : 'audio_call_duration';

        const plan = await SubscriptionPlan.findOne({ type: planType, isActive: true }).lean();
        if (!plan) return 5 * 60;

        const feature = plan.features.find(
            f => f.moduleType === moduleType && f.featureKey === featureKey
        );

        if (!feature || feature.limit === null) return 120 * 60;

        return feature.limit * 60;
    }

    private generateNumericUid(): number {
        return Math.floor(Math.random() * 1000000000);
    }
}
