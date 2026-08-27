import { Schema, model } from "mongoose";

// Reusable translation schema
const TranslationSchema = new Schema(
    {
        en: { type: String },
        hi: { type: String },
        kn: { type: String },
        te: { type: String },
        ta: { type: String },
        bn: { type: String },
    },
    { _id: false }
);

const HomeScreenBlockSchema = new Schema(
    {
        gameTab: [
            {
                name: { type: String },
                iconUrl: { type: String },
                title: TranslationSchema,
                active: { type: Boolean, default: true },
                redirectTo: { type: String }
            }
        ],
        privateTable: {
            title: TranslationSchema,
            description: TranslationSchema,
            imageUrl: { type: String }
        },
        header: {
            spinnerImgUrl: { type: String },
            logoImgUrl: { type: String }
        },
    },
    { _id: false }
);

// Slide schema
const SlideSchema = new Schema(
    {
        title: { type: TranslationSchema, required: true },
        description: { type: TranslationSchema, required: true },
        imageUrl: { type: String, required: true },
    },
    { _id: false }
);

// Main content schema
const AppContentSchema = new Schema(
    {
        introSlides: [SlideSchema],
        terms: { type: TranslationSchema },
        welcomeScreen: { type: TranslationSchema },
        showReferral: { type: Boolean, default: true },
        logoUrl: { type: TranslationSchema },
        appName: { type: TranslationSchema },

        // ✅ Newly added fields
        aboutUs: { type: TranslationSchema },
        disclaimer: { type: TranslationSchema },
        fairPlay: { type: TranslationSchema },
        legality: { type: TranslationSchema },
        privacyPolicy: { type: TranslationSchema },
        refundPolicy: { type: TranslationSchema },
        certification: { type: TranslationSchema },
        certificateImageUrl: { type: String, default: '' },

        homeScreenBlocks: HomeScreenBlockSchema,
    },
    { versionKey: false }
);

export const AppContent = model("AppContent", AppContentSchema);
