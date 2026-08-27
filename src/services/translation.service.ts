import redis from "../config/redis";
import { Translation } from "../models/Translation";
import { REDIS_KEYS, REDIS_TTL } from "../config/constants";

export const getTranslation = async (key: string, lang: string) => {
    const redisKey = REDIS_KEYS.TRANSLATIONS(lang);
    const cached = await redis.get(redisKey);

    let translations;
    if (cached) {
        translations = JSON.parse(cached);
    } else {
        translations = await Translation.find({}).lean();
        const translationMap: Record<string, string> = {};
        for (const entry of translations) {
            const translated = (entry.translations as Record<string, string | null | undefined>)?.[lang];
            if (translated) {
                translationMap[entry.key] = translated;
            }
        }
        await redis.set(redisKey, JSON.stringify(translationMap), { EX: REDIS_TTL.TRANSLATIONS });
        translations = translationMap;
    }

    return translations?.[key] || key;
};


// Used to invalidate cache when updated by Admin
export const invalidateTranslationCache = async (key: string) => {
    const cacheKey = `translation:${key}`;
    await redis.del(cacheKey);
};
