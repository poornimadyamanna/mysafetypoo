import { SmartCardLinkMaster } from '../models/SmartCardLinkMaster';
import { SubscriptionPlan } from '../models/SubscriptionPlan';

// Get features from subscription plan
export const getAvailableFeatures = async (moduleType: string, plan: 'Free' | 'Premium') => {
    const subscriptionPlan = await SubscriptionPlan.findOne({
        type: plan,
        isActive: true
    }).lean();

    if (!subscriptionPlan) return [];

    // Filter features by moduleType and isAvailable
    return subscriptionPlan.features;
};

// Check if feature requires Premium (compare Free vs Premium availability)
export const isPremiumFeature = async (moduleType: string, featureKey: string): Promise<boolean> => {
    const [freePlan, premiumPlan] = await Promise.all([
        SubscriptionPlan.findOne({ type: 'Free', isActive: true }).lean(),
        SubscriptionPlan.findOne({ type: 'Premium', isActive: true }).lean()
    ]);

    if (!freePlan || !premiumPlan) return true;

    const freeFeature: any = freePlan.features.find(
        f => f.moduleType === moduleType && f.featureKey === featureKey
    );
    const premiumFeature: any = premiumPlan.features.find(
        f => f.moduleType === moduleType && f.featureKey === featureKey
    );

    // If not available in free but available in premium, it's premium-only
    if (freeFeature && premiumFeature) {
        return !freeFeature.isAvailable && premiumFeature.isAvailable;
    }

    // If only exists in premium, it's premium-only
    return !freeFeature && !!premiumFeature;
};


export const isAllowed = async (moduleType: string, featureKey: string, plan: 'Free' | 'Premium', data: any): Promise<boolean> => {
    const features = await getAvailableFeatures(moduleType, plan);
    const feature: any = features.find(f => f.moduleType === moduleType && f.featureKey === featureKey);

    if (!feature) return false;

    if (moduleType === 'SmartCard' && featureKey === 'links_available') {
        const linksAvailable = await Promise.all(data?.activeSocialLinks.map(async (x: any) => {
            const ss = await SmartCardLinkMaster.findById(x.type).select('webSiteName -_id').lean();
            return ss?.webSiteName || '';
        }));

        // If feature.links is empty, all links are allowed (Premium)
        if (!feature.links || feature.links.length === 0) return true;

        // All user's links must be in the allowed links list
        return linksAvailable.every((link: string) => feature.links.includes(link));
    }
    if (moduleType === 'DoorBell' && featureKey === 'family_members') {
        const familyMembersCount = data?.familyMemberIds?.length;

        return feature.limit >= familyMembersCount;
    }
    if (moduleType === 'LostFound' && featureKey === 'family_members') {
        const familyMembersCount = data?.familyMemberIds?.length;

        return feature.limit >= familyMembersCount;
    }


    return feature.isAvailable;
};

// Get feature configuration for user's plan
export const getFeatureConfig = async (moduleType: string, plan: 'Free' | 'Premium', featureKey: string) => {
    const subscriptionPlan = await SubscriptionPlan.findOne({
        type: plan,
        isActive: true
    }).lean();

    if (!subscriptionPlan) return null;

    const feature: any = subscriptionPlan.features.find(
        f => f.moduleType === moduleType && f.featureKey === featureKey
    );

    if (!feature) return null;

    return {
        isAvailable: feature.isAvailable,
        limit: feature.limit,
        links: feature.links
    };
};

// Get all features for all modules from subscription plan
export const getAllFeaturesForPlan = async (plan: 'Free' | 'Premium') => {
    const subscriptionPlan = await SubscriptionPlan.findOne({
        type: plan,
        isActive: true
    }).lean();

    if (!subscriptionPlan) return {};

    // Group features by moduleType
    const featuresByModule: any = {};
    subscriptionPlan.features.forEach((feature: any) => {
        if (!featuresByModule[feature.moduleType]) {
            featuresByModule[feature.moduleType] = [];
        }
        featuresByModule[feature.moduleType].push({
            featureName: feature.featureName,
            featureKey: feature.featureKey,
            isAvailable: feature.isAvailable,
            limit: feature.limit,
            links: feature.links
        });
    });

    return featuresByModule;
};
export const getFeatureLimit = async (moduleType: string, plan: 'Free' | 'Premium', featureKey: string): Promise<number | null> => {
    const subscriptionPlan = await SubscriptionPlan.findOne({
        type: plan,
        isActive: true
    }).lean();

    if (!subscriptionPlan) return null;

    const feature = subscriptionPlan.features.find(
        f => f.moduleType === moduleType && f.featureKey === featureKey
    );

    return feature?.limit ?? null; // null = unlimited
};