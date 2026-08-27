import { Response } from "express";
import { container } from "tsyringe";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../../utils/response";
import { ContentService } from "../../services/admin/content.service";

export class ContentController {
    private contentService = container.resolve(ContentService);

    // createContent = async (req: AuthenticatedRequest, res: Response) => {
    //     try {
    //         const userId = req.admin._id;
    //         const { title, message, moduleType } = req.body;

    //         const createdContent = await this.contentService.createContent({ title, message, moduleType, userId });

    //         return successResponse(req, res, 'content_created_successfully', createdContent);
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message || "something_went_wrong", 400);
    //     }
    // };

    getContent = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { field } = req.query;

            if (!field || typeof field !== 'string') {
                return errorResponse(req, res, 'field_required', 400);
            }

            const content = await this.contentService.getContent(field);

            return successResponse(req, res, 'content_retrieved', content);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    updateContent = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { field, translations } = req.body;

            if (!field || !translations) {
                return errorResponse(req, res, 'field_and_translations_required', 400);
            }

            const updatedContent = await this.contentService.updateContent(field, translations);

            return successResponse(req, res, 'content_updated_successfully', updatedContent);
        } catch (error: any) {
            return errorResponse(req, res, error.message || "something_went_wrong", 400);
        }
    };

    // deleteContent = async (req: AuthenticatedRequest, res: Response) => {
    //     try {
    //         const userId = req.admin._id;
    //         const { messageId } = req.body;

    //         const result = await this.contentService.deleteContent(messageId, userId);

    //         return successResponse(req, res, 'content_deleted_successfully', result);
    //     } catch (error: any) {
    //         return errorResponse(req, res, error.message || "something_went_wrong", 400);
    //     }
    // };

}
