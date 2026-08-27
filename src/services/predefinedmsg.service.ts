import { injectable } from "tsyringe";
import { PredefinedMessage } from "../models/PredefinedMessage";
import { QR } from "../models/QR";
import logger from "../config/logger";

@injectable()
export class PredefinedMessageService {
  constructor() { }

  createPredefinedMessage = async (messageData: any) => {
    try {
      const message = await PredefinedMessage.insertOne({
        moduleType: messageData.moduleType,
        title: messageData.title,
        message: messageData.message,
        isDefault: false,
        userId: messageData.userId
      });

      return message;
    } catch (err: any) {
      logger.error("createPredefinedMessage Error:", err);
      throw new Error(err.message);
    }
  };

  getPredefinedMessages = async (userId: string, moduleType: string) => {
    try {
      const messages = await PredefinedMessage.find({
        $or: [{ userId, moduleType }, { moduleType, isDefault: true }]
      })
        .select("title message isDefault moduleType createdAt")
        .sort({ createdAt: -1 })
        .lean();

      return messages;
    } catch (err) {
      logger.error("getPredefinedMessages Error:", err);
      throw new Error("messages_get_failed");
    }
  };

  updatePredefinedMessage = async (messageId: string, userId: string, updates: any) => {
    try {
      const message = await PredefinedMessage.findOneAndUpdate(
        { _id: messageId, userId, isDefault: false },
        updates,
        { new: true }
      ).lean();

      if (!message) throw new Error("message_not_found_or_unauthorized");

      return message;
    } catch (err: any) {
      logger.error("updatePredefinedMessage Error:", err);
      throw new Error(err.message);
    }
  };

  deletePredefinedMessage = async (messageId: string, userId: string) => {
    try {
      const message = await PredefinedMessage.findOneAndDelete({
        _id: messageId,
        userId,
        isDefault: false
      }).lean();

      if (!message) throw new Error("message_not_found_or_unauthorized");

      return { deletedId: messageId };
    } catch (err) {
      logger.error("deletePredefinedMessage Error:", err);
      throw new Error("message_delete_failed");
    }
  };

  getPredefinedMessagesForVisitor = async (qrId: string) => {
    try {
      const qr = await QR.findOne({ qrId }).lean();
      if (!qr) throw new Error("qr_not_found");

      const messages = await PredefinedMessage.find({
        $or: [{ userId: qr.ownerId, moduleType: qr.moduleType }, { moduleType: qr.moduleType, isDefault: true }]
      })
        .select("title message isDefault moduleType createdAt audioId")
        .sort({ createdAt: -1 })
        .lean();

      return messages;
    } catch (err) {
      logger.error("getPredefinedMessages Error:", err);
      throw new Error("messages_get_failed");
    }
  };

}