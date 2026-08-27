import { injectable } from "tsyringe";
import { PredefinedMessage } from "../../models/PredefinedMessage";
import { AppContent } from "../../models/AppContent";
import logger from "../../config/logger";

@injectable()
export class ContentService {
  constructor() { }

  // createContent = async (messageData: any) => {
  //   try {
  //     const message = await PredefinedMessage.insertOne({
  //       moduleType: messageData.moduleType,
  //       title: messageData.title,
  //       message: messageData.message,
  //       isDefault: true,
  //       userId: messageData.userId
  //     });

  //     return message;
  //   } catch (err: any) {
  //     logger.error("createPredefinedMessage Error:", err);
  //     throw new Error(err.message);
  //   }
  // };

  getContent = async (field: string) => {
    try {
      const content: any = await AppContent.findOne()
        .select(field)
        .lean();

      return content?.[field] || null;
    } catch (err) {
      logger.error("getContent Error:", err);
      throw new Error("content_get_failed");
    }
  };

  updateContent = async (field: string, translations: any) => {
    try {
      const content: any = await AppContent.findOneAndUpdate(
        {},
        { [field]: translations },
        { new: true, upsert: true }
      ).select(field).lean();

      return content?.[field];
    } catch (err: any) {
      logger.error("updateContent Error:", err);
      throw new Error(err.message);
    }
  };

  // deleteContent = async (messageId: string, userId: string) => {
  //   try {
  //     const message = await PredefinedMessage.findOneAndDelete({
  //       _id: messageId,
  //       userId,
  //       isDefault: true
  //     }).lean();

  //     if (!message) throw new Error("message_not_found_or_unauthorized");

  //     return { deletedId: messageId };
  //   } catch (err) {
  //     logger.error("deletePredefinedMessage Error:", err);
  //     throw new Error("message_delete_failed");
  //   }
  // };

}