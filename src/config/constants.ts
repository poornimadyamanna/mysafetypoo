export const REDIS_KEYS = {
    APP_CONTENT: (lang: string) => `app_content_${lang}`,
    TRANSLATIONS: (lang: string) => `translations_${lang}`,
};

export const REDIS_TTL = {
    APP_CONTENT: 600,       // 10 min
    TRANSLATIONS: 3600,     // 1 hour
};