import { Request, Response } from "express";
import { container } from "tsyringe";
import { ChatService } from "../services/chat.service";
import { errorResponse, successResponse } from "../utils/response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export class ChatController {
    private chatService = container.resolve(ChatService);

    getChatRoom = async (req: Request, res: Response) => {
        try {
            const roomId = req.params.roomId as string;
            const room = await this.chatService.getChatRoom(roomId);
            return successResponse(req, res, "chat_room_retrieved", room);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getOwnerChats = async (req: Request, res: Response) => {
        try {
            const ownerId = (req as any).user.userId;
            const chats = await this.chatService.getOwnerActiveChats(ownerId);
            return successResponse(req, res, "chats_retrieved", chats);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getMessages = async (req: Request, res: Response) => {
        try {
            const roomId = req.params.roomId as string;
            const { limit = 50, skip = 0 } = req.query;
            const messages = await this.chatService.getMessages(roomId, Number(limit), Number(skip));
            return successResponse(req, res, "messages_retrieved", messages);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
}
