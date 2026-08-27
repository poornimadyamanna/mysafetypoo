import { injectable } from "tsyringe";
import { ChatRoom } from "../models/ChatRoom";
import { ChatMessage } from "../models/ChatMessage";
import { House } from "../models/House";
import mongoose from "mongoose";

@injectable()
export class ChatService {
    async createChatRoom(
        qrId: string,
        moduleType: "DoorBell" | "Vehicle" | "SmartCard" | "LostFound",
        moduleProfileId: string,
        eventId: string,
        scannerId: string,
        scannerType: "Visitor" | "User",
        ownerId: string
    ) {
        const existingRoom = await ChatRoom.findOne({ eventId, status: "Active" });
        if (existingRoom) return existingRoom;

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(qrId)) throw new Error(`Invalid qrId: ${qrId}`);
        if (!mongoose.Types.ObjectId.isValid(moduleProfileId)) throw new Error(`Invalid moduleProfileId: ${moduleProfileId}`);
        if (!mongoose.Types.ObjectId.isValid(eventId)) throw new Error(`Invalid eventId: ${eventId}`);
        if (!mongoose.Types.ObjectId.isValid(scannerId)) throw new Error(`Invalid scannerId: ${scannerId}`);
        if (!mongoose.Types.ObjectId.isValid(ownerId)) throw new Error(`Invalid ownerId: ${ownerId}`);

        const room = await ChatRoom.create({
            qrId: new mongoose.Types.ObjectId(qrId),
            moduleType,
            moduleProfileId: new mongoose.Types.ObjectId(moduleProfileId),
            eventId: new mongoose.Types.ObjectId(eventId),
            scannerId: new mongoose.Types.ObjectId(scannerId),
            scannerType,
            ownerId: new mongoose.Types.ObjectId(ownerId),
            activeParticipantId: new mongoose.Types.ObjectId(ownerId),
            activeParticipantType: "Owner"
        });
        return room;
    }

    async getChatRoom(roomId: string) {
        return await ChatRoom.findById(roomId)
            .populate("scannerId", "name mobile")
            .populate("ownerId", "name mobile")
            .populate("activeParticipantId", "name");
    }

    async getOwnerActiveChats(ownerId: string) {
        return await ChatRoom.find({ ownerId, status: "Active" })
            .populate("scannerId", "name mobile")
            .populate("moduleProfileId")
            .sort({ lastMessageAt: -1 });
    }

    async switchParticipant(roomId: string, participantId: string, participantType: "Owner" | "FamilyMember") {
        const room = await ChatRoom.findById(roomId);
        if (!room) throw new Error("Chat room not found");

        // Verify participant is authorized
        if (participantType === "Owner" && room.ownerId.toString() !== participantId) {
            throw new Error("Unauthorized");
        }
        if (participantType === "FamilyMember" && room.moduleType === "DoorBell") {
            const house = await House.findById(room.moduleProfileId);
            if (!house?.memberIds.some(id => id.toString() === participantId)) {
                throw new Error("Unauthorized family member");
            }
        }

        room.activeParticipantId = new mongoose.Types.ObjectId(participantId);
        room.activeParticipantType = participantType;
        await room.save();
        return room;
    }

    async saveMessage(
        roomId: string,
        senderId: string,
        senderType: "Visitor" | "User" | "Owner" | "FamilyMember",
        messageType: "Text" | "Image" | "Voice",
        content?: string,
        mediaUrl?: string,
        mediaDuration?: number
    ) {
        const message = await ChatMessage.create({
            roomId,
            senderId,
            senderType,
            messageType,
            content,
            mediaUrl,
            mediaDuration
        });

        await ChatRoom.findByIdAndUpdate(roomId, { lastMessageAt: new Date() });
        return message;
    }

    async getMessages(roomId: string, limit: number = 50, skip: number = 0) {
        return await ChatMessage.find({ roomId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate("senderId", "name");
    }

    async markAsDelivered(messageIds: string[]) {
        await ChatMessage.updateMany(
            { _id: { $in: messageIds }, status: "Sent" },
            { status: "Delivered", deliveredAt: new Date() }
        );
    }

    async markAsSeen(messageIds: string[]) {
        await ChatMessage.updateMany(
            { _id: { $in: messageIds }, status: { $in: ["Sent", "Delivered"] } },
            { status: "Seen", seenAt: new Date() }
        );
    }

    async getUnreadCount(roomId: string, userId: string) {
        return await ChatMessage.countDocuments({
            roomId,
            senderId: { $ne: userId },
            status: { $ne: "Seen" }
        });
    }

    async closeChatRoom(roomId: string) {
        await ChatRoom.findByIdAndUpdate(roomId, {
            status: "Closed",
            closedAt: new Date()
        });
    }
}
