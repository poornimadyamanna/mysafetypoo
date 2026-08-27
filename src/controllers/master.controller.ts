import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { successResponse, errorResponse } from "../utils/response";
import { MasterService } from "../services/master.service";
import { SessionToken } from "../models/SessionToken";
import logger from "../config/logger";

@injectable()
export class MasterController {
    constructor(private masterService: MasterService) { }
    getContent = async (req: Request, res: Response): Promise<Response> => {
        const lang = (req.headers["x-language"] as string) || "en";
        let isAuthenticated: boolean = false
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        const session = await SessionToken.findOne({ accessToken: token });
        isAuthenticated = !!session;

        // if (session) {
        // }
        const fieldsParam = req.query.fields as string;
        const fields = fieldsParam
            ? fieldsParam.split(",").map((f) => f.trim()).filter(Boolean)
            : [];

        try {
            const content = await this.masterService.getAppContent(lang, fields, isAuthenticated);
            if (!content) {
                return errorResponse(req, res, "app_content_not_found", 404);
            }
            return successResponse(req, res, "app_content_success", content, 200);
        } catch (error) {
            logger.error("Error fetching app content:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };

    getLanguages = async (req: Request, res: Response): Promise<Response> => {
        const lang = (req.headers["x-language"] as string) || "en";
        try {
            const language = await this.masterService.getLanguages();
            if (!language) {
                return errorResponse(req, res, "app_language_not_found", 404);
            }
            return successResponse(req, res, "app_language_success", language, 200);
        } catch (error) {
            logger.error("Error fetching app language:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };
    getModules = async (req: Request, res: Response): Promise<Response> => {

        try {
            const modules = await this.masterService.getModules();
            if (!modules) {
                return errorResponse(req, res, "app_modules_not_found", 404);
            }
            return successResponse(req, res, "app_modules_success", modules, 200);
        } catch (error) {
            logger.error("Error fetching app modules:", error);
            return errorResponse(req, res, "internal_server_error", 500);
        }
    };
    // createModules = async (req: Request, res: Response): Promise<Response> => {

    //     try {
    //         const modules = await this.masterService.createModules(req.body);
    //         if (!modules) {
    //             return errorResponse(req, res, "app_modules_not_found", 404);
    //         }
    //         return successResponse(req, res, "app_modules_success", modules, 200);
    //     } catch (error) {
    //         logger.error("Error fetching app modules:", error);
    //         return errorResponse(req, res, "internal_server_error", 500);
    //     }
    // };
}
