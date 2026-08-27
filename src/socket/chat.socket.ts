import { Server, Socket } from "socket.io";
import { container } from "tsyringe";
import { ChatService } from "../services/chat.service";
import { NotificationService } from "../services/notification.service";
import jwt from "jsonwebtoken";
import { Visitor } from "../models/Visitor";
import { User } from "../models/User";
import { FamilyMember } from "../models/FamilyMember";
import { House } from "../models/House";
import { Vehicle } from "../models/Vehicle";
import { SmartCard } from "../models/SmartCard";
import { LostFound } from "../models/LostFound";
import redis from "../config/redis";
import { BlockedVisitorService } from "../services/blockedvisitor.service";
import logger from "../config/logger";

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userType?: "User" | "Visitor" | "FamilyMember";
}

export class ChatSocketHandler {
    private io: Server;
    private chatService: ChatService;
    private notificationService: NotificationService;
    private static useRedis: boolean = false;
    private static onlineUsers: Map<string, string> = new Map(); // Fallback for non-Redis
    blockedVisitorService = container.resolve(BlockedVisitorService);

    // Initialize Redis usage check
    static async initialize() {
        try {
            if (redis.isOpen) {
                this.useRedis = true;
            }
        } catch {
            this.useRedis = false;
        }
    }

    // Get socket ID from Redis or Map
    static async getSocketId(userId: string): Promise<string | undefined> {
        if (this.useRedis && redis.isOpen) {
            try {
                return await redis.get(`socket:${userId}`) || undefined;
            } catch {
                return this.onlineUsers.get(userId);
            }
        }
        return this.onlineUsers.get(userId);
    }

    // Check if user is online
    static async isUserOnline(userId: string): Promise<boolean> {
        if (this.useRedis && redis.isOpen) {
            try {
                return await redis.exists(`socket:${userId}`) === 1;
            } catch {
                return this.onlineUsers.has(userId);
            }
        }
        return this.onlineUsers.has(userId);
    }

    // Set socket ID
    private static async setSocketId(userId: string, socketId: string): Promise<void> {
        if (this.useRedis && redis.isOpen) {
            try {
                await redis.setEx(`socket:${userId}`, 86400, socketId); // 24h expiry
            } catch {
                this.onlineUsers.set(userId, socketId);
            }
        } else {
            this.onlineUsers.set(userId, socketId);
        }
    }

    // Delete socket ID
    private static async deleteSocketId(userId: string): Promise<void> {
        if (this.useRedis && redis.isOpen) {
            try {
                await redis.del(`socket:${userId}`);
            } catch {
                this.onlineUsers.delete(userId);
            }
        } else {
            this.onlineUsers.delete(userId);
        }
    }

    constructor(io: Server) {
        this.io = io;
        this.chatService = container.resolve(ChatService);
        this.notificationService = container.resolve(NotificationService);
    }

    initialize() {
        const chatNamespace = this.io.of("/chat");

        chatNamespace.use(this.authenticateSocket.bind(this));

        chatNamespace.on("connection", async (socket: AuthenticatedSocket) => {
            logger.info(`Chat connected: ${socket.userId}`);

            if (socket.userId) {
                await ChatSocketHandler.setSocketId(socket.userId, socket.id);
                this.broadcastOnlineStatus(socket.userId, true);
            }

            socket.on("join_room", (data, ack) => this.handleJoinRoom(socket, data, ack));
            socket.on("leave_room", (data, ack) => this.handleLeaveRoom(socket, data, ack));
            socket.on("send_message", (data, ack) => this.handleSendMessage(socket, data, ack));
            socket.on("typing", (data, ack) => this.handleTyping(socket, data, ack));
            socket.on("message_delivered", (data, ack) => this.handleMessageDelivered(socket, data, ack));
            socket.on("message_seen", (data, ack) => this.handleMessageSeen(socket, data, ack));
            socket.on("get_unread_count", (data, ack) => this.handleGetUnreadCount(socket, data, ack));
            socket.on("switch_participant", (data, ack) => this.handleSwitchParticipant(socket, data, ack));
            socket.on("close_room", (data, ack) => this.handleCloseRoom(socket, data, ack));
            socket.on("error", (error) => this.handleError(socket, error));

            socket.on("disconnect", (reason) => {
                (async () => {
                    try {
                        if (socket.userId) {
                            await ChatSocketHandler.deleteSocketId(socket.userId);
                            this.broadcastOnlineStatus(socket.userId, false);
                        }
                        logger.info(`Chat disconnected: ${socket.userId}, reason: ${reason}`);
                    } catch (error) {
                        logger.error('Disconnect handler error:', error);
                    }
                })();
            });


        });
    }

    private authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
        try {
            const token = socket.handshake.auth.token;
            if (!token) throw new Error("No token provided");

            const secret = process.env.ACCESS_TOKEN_SECRET;
            if (!secret) throw new Error("JWT secret not configured");

            const decoded: any = jwt.verify(token, secret);
            socket.userId = decoded.id || decoded.userId || decoded.visitorId;
            socket.userType = decoded.userType || "User";
            next();
        } catch (error) {
            // Silent fail - client will retry with proper auth
            next(new Error("Authentication failed"));
        }
    }

    private async isAuthorizedForRoom(roomId: string, userId: string, userType?: string): Promise<boolean> {
        try {
            const room = await this.chatService.getChatRoom(roomId);
            if (!room) return false;

            // Check if visitor is blocked
            if (userType === "Visitor" && room.ownerId) {
                const visitor = await Visitor.findById(userId).select('mobile').lean();
                if (visitor) {
                    const isBlocked = await this.blockedVisitorService.isVisitorBlockedByPhone(
                        room.ownerId._id?.toString() || room.ownerId.toString(),
                        visitor.mobile
                    );
                    if (isBlocked) return false;
                }
            }

            // Check if user is visitor, owner, or active participant
            if (room.scannerId?._id?.toString() === userId ||
                room.ownerId?._id?.toString() === userId ||
                room.activeParticipantId?.toString() === userId) {
                return true;
            }

            // Check if user is a family member assigned to the profile
            const modelMap: any = { DoorBell: House, Vehicle, SmartCard, LostFound };
            const profile = await modelMap[room.moduleType]?.findById(room.moduleProfileId).lean();

            if (profile?.memberIds?.length) {
                const familyMembers = await FamilyMember.find({ _id: { $in: profile.memberIds } }).populate('memberId', '_id').lean();
                return familyMembers.some(fm => (fm.memberId as any)?._id?.toString() === userId);
            }

            return false;
        } catch (error) {
            logger.error('Authorization check error:', error);
            return false;
        }
    }

    private async handleJoinRoom(socket: AuthenticatedSocket, data: { roomId: string }, ack?: Function) {
        try {
            if (!data?.roomId || typeof data.roomId !== 'string') {
                ack?.({ success: false, error: "Invalid roomId" });
                return;
            }

            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            const room = await this.chatService.getChatRoom(data.roomId);
            if (!room) {
                ack?.({ success: false, error: "Room not found" });
                return;
            }

            socket.join(data.roomId);
            socket.emit("room_joined", { room });

            // Notify online status
            const otherParticipants = this.getOtherParticipants(room, socket.userId!);
            const onlineStatuses = await Promise.all(otherParticipants.map(async id => ({
                userId: id,
                online: await ChatSocketHandler.isUserOnline(id)
            })));
            socket.emit("participants_status", onlineStatuses);

            ack?.({ success: true, roomId: data.roomId });
        } catch (error: any) {
            logger.error('Join room error:', error);
            ack?.({ success: false, error: error.message || 'Failed to join room' });
        }
    }

    private async handleSendMessage(socket: AuthenticatedSocket, data: {
        roomId: string;
        messageType: "Text" | "Image" | "Voice";
        content?: string;
        mediaUrl?: string;
        mediaDuration?: number;
    }, ack?: Function) {
        try {
            if (!data?.roomId || !data?.messageType) {
                ack?.({ success: false, error: "Invalid data" });
                return;
            }

            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            const room = await this.chatService.getChatRoom(data.roomId);
            if (!room) {
                ack?.({ success: false, error: "Room not found" });
                return;
            }

            const senderType = this.getSenderType(room, socket.userId!);

            const message = await this.chatService.saveMessage(
                data.roomId,
                socket.userId!,
                senderType,
                data.messageType,
                data.content,
                data.mediaUrl,
                data.mediaDuration
            );

            // Fetch sender details based on senderType
            const senderDetails = await this.getSenderDetails(socket.userId!, senderType);

            const chatNamespace = this.io.of("/chat");
            const messageData = {
                ...message.toObject(),
                status: "Sent",
                senderDetails
            };

            // Emit to all room participants including sender
            chatNamespace.in(data.roomId).emit("new_message", messageData);

            // Update room list for all participants
            const allParticipants = this.getAllParticipants(room);
            for (const participantId of allParticipants) {
                const socketId = await ChatSocketHandler.getSocketId(participantId);
                if (socketId) {
                    chatNamespace.to(socketId).emit("room_list_update", {
                        roomId: data.roomId,
                        lastMessage: {
                            content: message.content,
                            messageType: message.messageType,
                            timestamp: message.createdAt,
                            isOwn: participantId === socket.userId
                        }
                    });
                }
            }

            // Send acknowledgement with message details
            ack?.({ success: true, message: messageData });

            // Send FCM notification to offline recipients
            await this.notificationService.notifyNewMessage(
                data.roomId,
                socket.userId!,
                senderDetails.name,
                data.messageType,
                data.content
            );

            // Check if recipient is online and auto-deliver
            const recipients = this.getOtherParticipants(room, socket.userId!);
            const onlineRecipients = [];
            for (const id of recipients) {
                if (await ChatSocketHandler.isUserOnline(id)) {
                    onlineRecipients.push(id);
                }
            }

            if (onlineRecipients.length > 0) {
                setTimeout(async () => {
                    await this.chatService.markAsDelivered([message._id.toString()]);
                    chatNamespace.in(data.roomId).emit("message_status_update", {
                        messageIds: [message._id.toString()],
                        status: "Delivered"
                    });
                }, 500);
            }

        } catch (error: any) {
            logger.error('Send message error:', error);
            ack?.({ success: false, error: error.message || 'Failed to send message' });
        }
    }

    private async handleTyping(socket: AuthenticatedSocket, data: { roomId: string; isTyping: boolean }, ack?: Function) {
        try {
            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            socket.to(data.roomId).emit("user_typing", {
                userId: socket.userId,
                isTyping: data.isTyping
            });
            ack?.({ success: true });
        } catch (error: any) {
            ack?.({ success: false, error: error.message });
        }
    }

    private async handleMessageDelivered(socket: AuthenticatedSocket, data: { roomId: string; messageIds: string[] }, ack?: Function) {
        try {
            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            await this.chatService.markAsDelivered(data.messageIds);

            this.io.of("/chat").in(data.roomId).emit("message_status_update", {
                messageIds: data.messageIds,
                status: "Delivered"
            });

            ack?.({ success: true, messageIds: data.messageIds, status: "Delivered" });
        } catch (error: any) {
            ack?.({ success: false, error: error.message });
        }
    }

    private async handleMessageSeen(socket: AuthenticatedSocket, data: { roomId: string; messageIds: string[] }, ack?: Function) {
        try {
            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            await this.chatService.markAsSeen(data.messageIds);

            this.io.of("/chat").in(data.roomId).emit("message_status_update", {
                messageIds: data.messageIds,
                status: "Seen"
            });

            ack?.({ success: true, messageIds: data.messageIds, status: "Seen" });
        } catch (error: any) {
            ack?.({ success: false, error: error.message });
        }
    }

    private async handleGetUnreadCount(socket: AuthenticatedSocket, data: { roomId: string }, ack?: Function) {
        try {
            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            const unreadCount = await this.chatService.getUnreadCount(data.roomId, socket.userId!);

            socket.emit("unread_count", {
                roomId: data.roomId,
                unreadCount
            });

            ack?.({ success: true, roomId: data.roomId, unreadCount });
        } catch (error: any) {
            ack?.({ success: false, error: error.message });
        }
    }

    private async handleSwitchParticipant(socket: AuthenticatedSocket, data: {
        roomId: string;
        participantId: string;
        participantType: "Owner" | "FamilyMember";
    }, ack?: Function) {
        try {
            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            const room = await this.chatService.switchParticipant(
                data.roomId,
                data.participantId,
                data.participantType
            );

            this.io.of("/chat").in(data.roomId).emit("participant_switched", {
                activeParticipantId: room.activeParticipantId,
                activeParticipantType: room.activeParticipantType
            });

            ack?.({ success: true, activeParticipantId: room.activeParticipantId, activeParticipantType: room.activeParticipantType });
        } catch (error: any) {
            ack?.({ success: false, error: error.message });
        }
    }

    private async handleLeaveRoom(socket: AuthenticatedSocket, data: { roomId: string }, ack?: Function) {
        try {
            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            socket.leave(data.roomId);

            // Notify other participants
            socket.to(data.roomId).emit("user_left_room", {
                userId: socket.userId,
                roomId: data.roomId
            });

            ack?.({ success: true, roomId: data.roomId });
        } catch (error: any) {
            ack?.({ success: false, error: error.message });
        }
    }

    private async handleCloseRoom(socket: AuthenticatedSocket, data: { roomId: string }, ack?: Function) {
        try {
            if (!await this.isAuthorizedForRoom(data.roomId, socket.userId!, socket.userType)) {
                ack?.({ success: false, error: "Unauthorized" });
                return;
            }

            await this.chatService.closeChatRoom(data.roomId);
            this.io.of("/chat").in(data.roomId).emit("room_closed", { roomId: data.roomId });
            ack?.({ success: true, roomId: data.roomId });
        } catch (error: any) {
            ack?.({ success: false, error: error.message });
        }
    }

    private handleError(socket: AuthenticatedSocket, error: any) {
        logger.error(`Socket error for user ${socket.userId}:`, error);
        socket.emit("error", { message: error.message || "Unknown error occurred" });
    }

    private broadcastOnlineStatus(userId: string, online: boolean) {
        this.io.of("/chat").emit("user_status_change", { userId, online });
    }

    private getSenderType(room: any, userId: string): "Visitor" | "User" | "Owner" | "FamilyMember" {
        if (room.scannerId?._id?.toString() == userId) {
            return room.scannerType === "Visitor" ? "Visitor" : "User";
        }
        if (room.ownerId?._id.toString() == userId) {
            return "Owner";
        }
        return "FamilyMember";
    }

    private getAllParticipants(room: any): string[] {
        const participants = [
            room.scannerId?._id?.toString(),
            room.ownerId?._id?.toString()
        ];
        if (room.activeParticipantId && room.activeParticipantType === "FamilyMember") {
            participants.push(room.activeParticipantId.toString());
        }
        return participants;
    }

    private getOtherParticipants(room: any, currentUserId: string): string[] {
        return this.getAllParticipants(room).filter(id => id !== currentUserId);
    }

    private async getSenderDetails(senderId: string, senderType: string): Promise<{ name: string; photo: string }> {

        let senderDetails = { name: 'Unknown', photo: '' };

        try {
            if (senderType === 'Visitor') {
                const visitor = await Visitor.findById(senderId).select('name photo').lean();
                if (visitor) {
                    senderDetails = {
                        name: visitor.name || 'Visitor',
                        photo: ''
                    };
                }
            } else if (senderType === 'Owner' || senderType === 'User') {
                const user = await User.findById(senderId).select('name avatarUrl').lean();
                if (user) {
                    senderDetails = {
                        name: user.name || 'User',
                        photo: user.avatarUrl || ''
                    };
                }
            } else if (senderType === 'FamilyMember') {
                const member = await FamilyMember.findById(senderId).populate('memberId', 'name avatarUrl').select('memberId').lean();
                if (member && member.memberId) {
                    senderDetails = {
                        name: (member.memberId as any).name || 'Family Member',
                        photo: (member.memberId as any).avatarUrl || ''
                    };
                }
            }
        } catch (error) {
            logger.error('Error fetching sender details:', error);
        }

        return senderDetails;
    }
}
