import { Response } from "express";
import { container } from "tsyringe";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../../utils/response";
import { AudioService } from "../../services/admin/audio.service";
import logger from "../../config/logger";

export class AudioController {
    private audioService = container.resolve(AudioService);

    constructor() { }
    getAllAudioRecordings = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {

        try {
            const recordings = await this.audioService.getAllAudioRecordings();
            if (!recordings) {
                return errorResponse(req, res, "app_modules_not_found", 404);
            }
            return successResponse(req, res, "app_modules_success", recordings, 200);
        } catch (error) {
            logger.error("Error fetching app modules:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };

    createAudioRecording = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { fileName, code, name } = req.body
            const recording = await this.audioService.createAudioRecording({ fileName, code, name });
            return successResponse(req, res, "audio_created_successfully", recording, 201);
        } catch (error) {
            logger.error("Error creating audio recording:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };

    updateAudioRecording = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { audioId, fileName, code, name } = req.body;
            const recording = await this.audioService.updateAudioRecording(audioId, { fileName, code, name });
            if (!recording) {
                return errorResponse(req, res, "audio_not_found", 404);
            }
            return successResponse(req, res, "audio_updated_successfully", recording, 200);
        } catch (error) {
            logger.error("Error updating audio recording:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };

    deleteAudioRecording = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { audioId } = req.body;
            const result = await this.audioService.deleteAudioRecording(audioId);
            if (!result) {
                return errorResponse(req, res, "audio_not_found", 404);
            }
            return successResponse(req, res, "audio_deleted_successfully", result, 200);
        } catch (error) {
            logger.error("Error deleting audio recording:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };

}
