import { injectable, inject } from 'tsyringe';
import { Server } from 'socket.io';
import { FCMService } from './fcm.service';
import { DeviceTokenService } from './devicetoken.service';
import { User } from '../models/User';
import { ChatRoom } from '../models/ChatRoom';
import { container } from 'tsyringe';
import { ChatSocketHandler } from '../socket/chat.socket';
import logger from '../config/logger';
import { QR } from '../models/QR';
import { House } from '../models/House';

@injectable()
export class NotificationService {
    constructor(
        @inject(FCMService) private fcmService: FCMService,
        @inject(DeviceTokenService) private deviceTokenService: DeviceTokenService
    ) { }

    private get io(): Server {
        return container.resolve<Server>('SocketIO');
    }

    async notifyCallStarted(qrId: string, callId: string, channelName: string, callType: 'video' | 'audio'): Promise<void> {
        const room = await ChatRoom.findOne({ qrId, status: 'Active' })
            .populate('ownerId', 'name mobile')
            .populate('scannerId', 'name phone')
            .lean();
        if (!room) return;

        const participantIds = [
            room.scannerId?._id?.toString(),
            room.ownerId?._id?.toString(),
            room.activeParticipantId?.toString()
        ].filter((id): id is string => Boolean(id));

        let house: any = null;
        if (room.moduleType == 'DoorBell') {
            house = await House.findOne({ _id: room.moduleProfileId })
                .populate({
                    path: 'memberIds',
                    populate: { path: 'memberId', select: 'name email phone' }
                })
                .lean();

            if (house?.memberIds) {
                const familyMemberUserIds = (house.memberIds as any[]).map(fm => fm.memberId?._id?.toString()).filter(Boolean);
                participantIds.push(...familyMemberUserIds);
            }
        }

        const caller = room.scannerType === 'Visitor'
            ? { name: (room.scannerId as any)?.name, phone: (room.scannerId as any)?.phone }
            : { name: (room.ownerId as any)?.name, phone: (room.ownerId as any)?.mobile };

        const title = `${callType === 'video' ? 'Video' : 'Audio'} Call Started`;
        const body = `${caller.name || 'Someone'} is calling`;

        // Socket.io notification
        try {
            const namespace = this.io.of('/chat');
            const payload = { callId, channelName, callType, callerName: caller.name, callerPhone: caller.phone };

            for (const participantId of participantIds) {
                const socketId = await ChatSocketHandler.getSocketId(participantId);
                if (socketId) {
                    namespace.to(socketId).emit('call_started', payload);
                }
            }
        } catch (error) {
            logger.error('Socket.io notification error:', error);
        }

        // FCM for offline users - send role-specific notifications
        for (const participantId of participantIds) {
            const tokens = await this.deviceTokenService.getActiveTokensByUserIds([participantId]);
            if (tokens.length === 0) continue;

            const isOwner = room.ownerId?._id?.toString() === participantId;
            const role = isOwner ? 'owner' : 'family';

            const data = {
                callId,
                channelName,
                roomId: room._id.toString(),
                type: 'call_start',
                callType,
                callerName: caller.name || '',
                callerPhone: caller.phone || '',
                role
            };

            await this.fcmService.sendToMultiple(tokens, title, body, data);
        }
    }

    async notifyCallEnded(qrId: string, callId: string, durationSeconds: number, role: 'owner' | 'family' | 'visitor'): Promise<void> {
        const room = await ChatRoom.findOne({ qrId, status: 'Active' }).lean();
        if (!room) return;

        const participantIds = [
            room.scannerId?._id?.toString(),
            room.ownerId?._id?.toString(),
            room.activeParticipantId?.toString()
        ].filter((id): id is string => Boolean(id));

        if (room.moduleType == 'DoorBell') {
            const house = await House.findOne({ _id: room.moduleProfileId })
                .populate({
                    path: 'memberIds',
                    populate: { path: 'memberId', select: 'name email phone' }
                })
                .lean();

            if (house?.memberIds) {
                const familyMemberUserIds = (house.memberIds as any[]).map(fm => fm.memberId?._id?.toString()).filter(Boolean);
                participantIds.push(...familyMemberUserIds);
            }
        }

        const title = 'Call Ended';
        const body = `Call duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
        const data = {
            callId,
            roomId: room._id.toString(),
            type: 'call_end',
            durationSeconds: durationSeconds.toString(),
            endBy: role
        };

        try {
            const namespace = this.io.of('/chat');
            const payload = { callId, roomId: room._id.toString(), durationSeconds, endBy: role };

            for (const participantId of participantIds) {
                const socketId = await ChatSocketHandler.getSocketId(participantId);
                if (socketId) {
                    namespace.to(socketId).emit('call_ended', payload);
                }
            }
        } catch (error) {
            logger.error('Socket.io notification error:', error);
        }

        // FCM for offline users
        const tokens = await this.deviceTokenService.getActiveTokensByUserIds(participantIds);
        if (tokens.length > 0) {
            await this.fcmService.sendToMultiple(tokens, title, body, data);
        }
    }

    async notifyNewMessage(roomId: string, senderId: string, senderName: string, messageType: string, content?: string): Promise<void> {
        const room = await ChatRoom.findById(roomId).lean();
        if (!room) return;

        const qr = await QR.findById(room.qrId).lean();
        if (!qr) return;
        const recipientIds = [
            room.scannerId?._id?.toString(),
            room.ownerId?._id?.toString(),
            room.activeParticipantId?.toString()
        ].filter((id): id is string => Boolean(id) && id !== senderId);

        if (room.moduleType == 'DoorBell') {
            const house = await House.findOne({ _id: room.moduleProfileId })
                .populate({
                    path: 'memberIds',
                    populate: { path: 'memberId', select: 'name email phone' }
                })
                .lean();

            if (house?.memberIds) {
                const familyMemberUserIds = (house.memberIds as any[]).map(fm => fm.memberId?._id?.toString()).filter(Boolean);
                recipientIds.push(...familyMemberUserIds);
            }
        }

        const title = senderName || 'New Message';
        const body = messageType === 'Text' ? (content || 'Sent a message') : `Sent ${messageType.toLowerCase()}`;
        const data = {
            roomId,
            senderId,
            type: 'chat',
            messageType,
            moduleType: room.moduleType || '',
            moduleProfileId: room.moduleProfileId?.toString() || '',
            qrId: qr.qrId?.toString() || ''
        };

        const tokens = await this.deviceTokenService.getActiveTokensByUserIds(recipientIds);
        if (tokens.length > 0) {
            await this.fcmService.sendToMultiple(tokens, title, body, data);
        }
    }
}
