import { injectable } from "tsyringe";
import { AppContent } from "../models/AppContent";
import redis from "../config/redis";
import { REDIS_KEYS, REDIS_TTL } from "../config/constants";
import { Language } from "../models/Language";
import { ModuleMaster } from "../models/ModuleMaster";
import { AudioRecording } from "../models/AudioRecordings";

const translateField = (field: any, lang: string): string =>
    typeof field === "object" && field !== null
        ? field[lang] || field["en"] || ""
        : "";

const translateSlides = (slides: any[], lang: string) =>
    slides.map((slide) => ({
        title: translateField(slide.title, lang),
        description: translateField(slide.description, lang),
        imageUrl: slide.imageUrl,
    }));

@injectable()
export class MasterService {
    getAppContent = async (lang: string = "en", fields: string[] = [], isAuthenticated: boolean = false) => {
        const isAllFields = fields.length === 0;
        const redisKey = REDIS_KEYS.APP_CONTENT(lang);

        const cached = await redis.get(redisKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (!isAuthenticated) {
                // Restrict to introSlides and terms only
                return {
                    introSlides: parsed.introSlides,
                    terms: parsed.terms
                };
            }
            if (!isAllFields) {
                return Object.fromEntries(
                    fields.map((key) => [key, parsed[key]]).filter(([_, val]) => val !== undefined)
                );
            }
            return parsed;
        }

        const content = await AppContent.findOne().lean();

        if (!content) return null;

        const result: any = {};
        const include = (key: string) => isAllFields || fields.includes(key);

        // If not authenticated, force only these fields
        if (!isAuthenticated) {
            result.introSlides = translateSlides(content.introSlides || [], lang);
            result.terms = translateField(content.terms, lang);
            return result;
        }

        if (include("introSlides")) result.introSlides = translateSlides(content.introSlides || [], lang);
        if (include("terms")) result.terms = translateField(content.terms, lang);
        if (include("welcomeScreen")) result.welcomeScreen = translateField(content.welcomeScreen, lang);
        if (include("appName")) result.appName = translateField(content.appName, lang);
        if (include("logoUrl")) result.logoUrl = translateField(content.logoUrl, lang);
        if (include("showReferral")) result.showReferral = content.showReferral;

        if (include("aboutUs")) result.aboutUs = translateField(content.aboutUs, lang);
        if (include("disclaimer")) result.disclaimer = translateField(content.disclaimer, lang);
        if (include("fairPlay")) result.fairPlay = translateField(content.fairPlay, lang);
        if (include("legality")) result.legality = translateField(content.legality, lang);
        if (include("privacyPolicy")) result.privacyPolicy = translateField(content.privacyPolicy, lang);
        if (include("refundPolicy")) result.refundPolicy = translateField(content.refundPolicy, lang);
        if (include("certification")) result.certification = translateField(content.certification, lang);
        // if (include("homeScreenBlocks")) result.homeScreenBlocks = content.homeScreenBlocks;
        if (include("homeScreenBlocks")) {
            const blocks: any = content.homeScreenBlocks || {};
            const translatedBlocks: any = {};

            // Translate gameTab array
            if (blocks.gameTab) {
                translatedBlocks.gameTab = blocks.gameTab.map((tab: any) => ({
                    ...tab,
                    title: translateField(tab.title, lang),
                }));
            }
            if (blocks.header) {
                translatedBlocks.header = blocks.header
            }

            // Translate privateTable object
            if (blocks.privateTable) {
                translatedBlocks.privateTable = {
                    ...blocks.privateTable,
                    title: translateField(blocks.privateTable.title, lang),
                    description: translateField(blocks.privateTable.description, lang),
                };
            }

            // Translate intenalBanners
            if (blocks.intenalBanners) {
                translatedBlocks.intenalBanners = blocks.intenalBanners.map((banner: any) => ({
                    ...banner,
                    bannerImageUrl: translateField(banner.bannerImageUrl, lang),
                }));
            }

            // Translate promotionalBanners
            if (blocks.promotionalBanners) {
                translatedBlocks.promotionalBanners = blocks.promotionalBanners.map((banner: any) => ({
                    ...banner,
                    bannerImageUrl: translateField(banner.bannerImageUrl, lang),
                }));
            }

            result.homeScreenBlocks = translatedBlocks;
        }
        if (include("certificateImageUrl")) result.certificateImageUrl = content.certificateImageUrl;

        if (isAllFields) {
            await redis.set(redisKey, JSON.stringify(result), { EX: REDIS_TTL.APP_CONTENT });
        }

        return result;
    };

    getLanguages = async () => {
        const languageList = await Language.find().lean();
        return languageList;
    };
    getModules = async () => {
        const modules = await ModuleMaster.find().select('-_id name code isActive').lean();
        return modules;
    };
    // createModules = async (moduleData: any[]) => {
    //     const modules = await ModuleMaster.insertMany(moduleData);
    //     return modules;
    // };
}
