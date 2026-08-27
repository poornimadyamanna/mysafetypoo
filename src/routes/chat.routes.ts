import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const chatController = new ChatController();

router.use(authenticate);

// Get chat room details
router.get("/room/:roomId", chatController.getChatRoom);

// Get owner's active chats
router.get("/owner/chats", chatController.getOwnerChats);

// Get messages for a room
router.get("/room/:roomId/messages", chatController.getMessages);

export default router;
