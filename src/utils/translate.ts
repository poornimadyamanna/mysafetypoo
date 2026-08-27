import { getTranslation } from "../services/translation.service";
import { Request } from "express";

const supportedLangs = ["en", "hi", "kn", "te", "ta", "bn","mr","od","ar"];

export const translate = async (req: Request, key: string) => {
    const langRaw = (req as any).user?.lang || req.headers["x-language"] || "en";
    const lang = supportedLangs.includes(langRaw.toLowerCase()) ? langRaw.toLowerCase() : "en";
    return await getTranslation(key, lang);
};