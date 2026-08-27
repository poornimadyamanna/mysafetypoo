import { CallSession } from '../models/CallSession';
import { Subscription } from '../models/Subscription';
import { getFeatureLimit } from '../utils/featureMatrix';
import { isUserInTrialPeriod } from '../utils/trialPeriod';
import { ChatRoom } from '../models/ChatRoom';
import { ChatMessage } from '../models/ChatMessage';
import { House } from '../models/House';
import { Vehicle } from '../models/Vehicle';
import { SmartCard } from '../models/SmartCard';
import { LostFound } from '../models/LostFound';
import { User } from '../models/User';
import { Visitor } from '../models/Visitor';
import { FamilyMember } from '../models/FamilyMember';
import { BlockedVisitor } from '../models/BlockedVisitor';

export class CallService {
    async startCall(userId: string, moduleType: string, sessionId: string, callType: 'video' | 'audio') {
        const session = await CallSession.create({
            userId,
            moduleType,
            sessionId,
            callType,
            startTime: new Date(),
            status: 'active'
        });

        return session;
    }

    async endCall(sessionId: string) {
        const session = await CallSession.findOne({ sessionId, status: 'active' });
        if (!session) throw new Error('call_session_not_found');

        const endTime = new Date();
        const durationSeconds = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

        session.endTime = endTime;
        session.durationSeconds = durationSeconds;
        session.status = 'completed';
        await session.save();

        return { sessionId, durationSeconds };
    }

    async checkCallDurationLimit(userId: string, moduleType: string, callType: 'video' | 'audio'): Promise<{ allowed: boolean; remainingSeconds?: number; limit?: number }> {
        // Check if user has active trial period
        const inTrialPeriod = await isUserInTrialPeriod(userId, moduleType);

        // If in trial period, grant unlimited access
        if (inTrialPeriod) {
            return { allowed: true };
        }

        const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
        const userPlan = subscription?.plan || 'Free';

        const featureKey = callType === 'video' ? 'video_call_duration' : 'audio_call_duration';
        const limitMinutes = await getFeatureLimit(moduleType, userPlan, featureKey);

        // null = unlimited
        if (limitMinutes === null) {
            return { allowed: true };
        }

        const limitSeconds = limitMinutes * 60;

        // Get total usage this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const totalUsage = await CallSession.aggregate([
            {
                $match: {
                    userId,
                    moduleType,
                    callType,
                    status: 'completed',
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSeconds: { $sum: '$durationSeconds' }
                }
            }
        ]);

        const usedSeconds = totalUsage[0]?.totalSeconds || 0;
        const remainingSeconds = limitSeconds - usedSeconds;

        return {
            allowed: remainingSeconds > 0,
            remainingSeconds: Math.max(0, remainingSeconds),
            limit: limitSeconds
        };
    }

    async getMonthlyUsage(userId: string, moduleType: string) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const usage = await CallSession.aggregate([
            {
                $match: {
                    userId,
                    moduleType,
                    status: 'completed',
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: '$callType',
                    totalSeconds: { $sum: '$durationSeconds' },
                    callCount: { $sum: 1 }
                }
            }
        ]);

        return usage.reduce((acc, item) => {
            acc[item._id] = {
                totalSeconds: item.totalSeconds,
                totalMinutes: Math.floor(item.totalSeconds / 60),
                callCount: item.callCount
            };
            return acc;
        }, {} as Record<string, any>);
    }

    async getModuleCalls(userId: string, moduleType: string, profileId: string) {
        const validModules = ['DoorBell', 'Vehicle', 'SmartCard', 'LostFound'];
        if (!validModules.includes(moduleType)) throw new Error('Invalid module type');

        const modelMap: any = { DoorBell: House, Vehicle, SmartCard, LostFound };
        const profile = await modelMap[moduleType].findById(profileId);
        if (!profile) throw new Error('Profile not found');

        // Check if user is owner or assigned family member
        const isOwner = profile.userId.toString() == userId.toString();
        const isFamilyMember = profile?.memberIds?.some(async (id: any) => {
            const user = await FamilyMember.findById(id).populate('memberId').select('memberId').lean();
            return user?._id.toString() == userId.toString()
        });

        if (!isOwner && !isFamilyMember) throw new Error('Unauthorized');

        const calls = await CallSession.find({ ownerId: userId, moduleType, moduleId: profileId })
            .sort({ createdAt: -1 })
            .lean();

        const callsWithBlockStatus = await Promise.all(calls.map(async (call: any) => {
            const visitorParticipant = call.participants?.find((p: any) => p.role === 'visitor');
            if (!visitorParticipant?.visitorId) return { ...call, isBlocked: false };

            const visitor = await Visitor.findById(visitorParticipant.visitorId).select('mobile').lean();
            const isBlocked = visitor?.mobile ? await BlockedVisitor.exists({ ownerId: userId, phone: visitor.mobile }) : false;

            return {
                ...call,
                visitorPhone: visitor?.mobile || '',
                isBlocked: !!isBlocked
            };
        }));

        return callsWithBlockStatus;
    }

    async getChatMessages(userId: string, roomId: string, page: number = 1, limit: number = 50) {


        const room = await ChatRoom.findById(roomId).lean();
        if (!room) throw new Error('Room not found');

        // const isParticipant =
        //     room.scannerId.toString() == userId ||
        //     room.ownerId.toString() == userId ||
        //     room.activeParticipantId?.toString() == userId;

        // if (!isParticipant) throw new Error('Unauthorized');

        const totalMessages = await ChatMessage.countDocuments({ roomId });
        const totalPages = Math.ceil(totalMessages / limit);
        const skip = (page - 1) * limit;

        const messages = await ChatMessage.find({ roomId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Fetch sender details based on senderType
        const messagesWithDetails = await Promise.all(messages.map(async (msg: any) => {
            let senderDetails = { name: 'Unknown', photo: '' };

            if (msg.senderType === 'Visitor') {
                const visitor = await Visitor.findById(msg.senderId).select('name photo mobile').lean();
                if (visitor) {
                    senderDetails = {
                        name: visitor.name || 'Visitor',
                        photo: ''
                    };
                }
            } else if (msg.senderType === 'Owner' || msg.senderType === 'User') {
                const user = await User.findById(msg.senderId).select('name avatarUrl').lean();
                if (user) {
                    senderDetails = {
                        name: user.name || 'User',
                        photo: user.avatarUrl
                    };
                }
            } else if (msg.senderType === 'FamilyMember') {
                const member = await FamilyMember.findById(msg.senderId).populate('memberId', 'name avatarUrl').select('memberId').lean();
                if (member) {
                    senderDetails = {
                        name: (member.memberId as any).name || 'Family Member',
                        photo: (member.memberId as any).avatarUrl || ''
                    };
                }
            }

            return {
                ...msg,
                senderDetails
            };
        }));

        return {
            messages: messagesWithDetails.reverse(),
            pagination: {
                currentPage: page,
                totalPages,
                totalMessages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    }

    async getModuleChatRooms(userId: string, moduleType: string, profileId: string) {
        const validModules = ['DoorBell', 'Vehicle', 'SmartCard', 'LostFound'];
        if (!validModules.includes(moduleType)) throw new Error('Invalid module type');

        const modelMap: any = { DoorBell: House, Vehicle, SmartCard, LostFound };
        const profile = await modelMap[moduleType].findById(profileId);
        if (!profile) throw new Error('Profile not found');

        // Check if user is owner or assigned family member
        const isOwner = profile.userId.toString() == userId;

        const isFamilyMember = profile?.memberIds?.some(async (id: any) => {
            const user = await FamilyMember.findById(id).populate('memberId').select('memberId').lean();
            return user?._id.toString() == userId
        });

        if (!isOwner && !isFamilyMember) throw new Error('Unauthorized');

        const chatRooms = await ChatRoom.find({
            moduleProfileId: profileId,
            moduleType,
            status: 'Active'
        })
            .populate('scannerId', 'name mobile')
            .populate('activeParticipantId', 'name')
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .lean();



        const roomsWithDetails = await Promise.all(chatRooms.map(async (room) => {
            const lastMessage = await ChatMessage.findOne({ roomId: room._id })
                .sort({ createdAt: -1 })
                .select('content messageType createdAt senderType')
                .lean();

            const unreadCount = await ChatMessage.countDocuments({
                roomId: room._id,
                senderId: { $ne: userId },
                status: { $in: ['Sent', 'Delivered'] }
            });

            const visitorPhone = (room.scannerId as any)?.mobile;
            
            const isBlocked = visitorPhone ? await BlockedVisitor.exists({ ownerId: userId, phone: visitorPhone }) : false;

            return {
                _id: room._id,
                visitor: {
                    name: (room.scannerId as any)?.name || 'Visitor',
                    phone: visitorPhone,
                    avatar: null
                },
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    messageType: lastMessage.messageType,
                    timestamp: lastMessage.createdAt,
                    isOwn: lastMessage.senderType !== 'Visitor'
                } : null,
                unreadCount,
                lastMessageAt: room.lastMessageAt || room.createdAt,
                status: room.status,
                isBlocked: !!isBlocked
            };
        }));

        return roomsWithDetails;
    }
}