import { Response } from "express";
import { container } from "tsyringe";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../../utils/response";
import logger from "../../config/logger";
import { LostFoundService } from "../../services/admin/lostfound.service";

export class LostFoundController {
    private lostFoundService = container.resolve(LostFoundService);

    constructor() { }
    getAllLostFounds = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.body;
            
            const result = await this.lostFoundService.getAllLostFounds(
                Number(page),
                Number(limit),
                search,
                sortBy,
                sortOrder
            );
            
            return successResponse(req, res, "lost_found_events_success", result, 200);
        } catch (error) {
            logger.error("Error fetching lost found events:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };

    // createAudioRecording = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    //     try {
    //         const { fileName, code, name } = req.body
    //         const recording = await this.lostFoundService.createAudioRecording({ fileName, code, name });
    //         return successResponse(req, res, "audio_created_successfully", recording, 201);
    //     } catch (error) {
    //         logger.error("Error creating audio recording:", error);
    //         return errorResponse(req, res, "internal_server_error", 500);
    //     }
    // };

    // updateAudioRecording = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    //     try {
    //         const { audioId, fileName, code, name } = req.body;
    //         const recording = await this.lostFoundService.updateAudioRecording(audioId, { fileName, code, name });
    //         if (!recording) {
    //             return errorResponse(req, res, "audio_not_found", 404);
    //         }
    //         return successResponse(req, res, "audio_updated_successfully", recording, 200);
    //     } catch (error) {
    //         logger.error("Error updating audio recording:", error);
    //         return errorResponse(req, res, "internal_server_error", 500);
    //     }
    // };

    // deleteAudioRecording = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    //     try {
    //         const { audioId } = req.body;
    //         const result = await this.lostFoundService.deleteAudioRecording(audioId);
    //         if (!result) {
    //             return errorResponse(req, res, "audio_not_found", 404);
    //         }
    //         return successResponse(req, res, "audio_deleted_successfully", result, 200);
    //     } catch (error) {
    //         logger.error("Error deleting audio recording:", error);
    //         return errorResponse(req, res, "internal_server_error", 500);
    //     }
    // };

}
