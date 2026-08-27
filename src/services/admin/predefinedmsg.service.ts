import { injectable } from "tsyringe";
import { PredefinedMessage } from "../../models/PredefinedMessage";
import logger from "../../config/logger";

@injectable()
export class PredefinedMessageService {
  constructor() { }

  createPredefinedMessage = async (messageData: any) => {
    // logger.log(messageData);

    try {
      const message = await PredefinedMessage.insertOne({
        moduleType: messageData.moduleType,
        title: messageData.title,
        message: messageData.message,
        isDefault: true,
        userId: messageData.userId,
        audioId: messageData.audioId
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
        moduleType, isDefault: true
      })
        .select("title message isDefault moduleType createdAt audioId")
        .populate("audioId")
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
        { _id: messageId, isDefault: true },
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
        isDefault: true
      }).lean();

      if (!message) throw new Error("message_not_found_or_unauthorized");

      return { deletedId: messageId };
    } catch (err) {
      logger.error("deletePredefinedMessage Error:", err);
      throw new Error("message_delete_failed");
    }
  };

}