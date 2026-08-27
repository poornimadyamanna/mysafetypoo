import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { UploadService } from "../services/upload.service";
import { successResponse, errorResponse } from "../utils/response";
import logger from "../config/logger";

@injectable()
export class UploadController {
  constructor(private uploadService: UploadService) { }

  uploadFile = async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const fileUrl = await this.uploadService.uploadFile(file!);

      return successResponse(req, res, "file_upload_success", fileUrl, 200);
    } catch (error: any) {
      logger.error("Upload failed:", error);
      return errorResponse(req, res, error.message || "upload_failed", 500);
    }
  };
}
