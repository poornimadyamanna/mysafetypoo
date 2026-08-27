import { injectable } from "tsyringe";
import { Pricing } from "../models/Pricing";
import { QR } from "../models/QR";

@injectable()
export class PricingService {
    createOrUpdatePricing = async (moduleType: string, downloadPrice: number, basePrice: number, bulkDiscounts: any[]) => {
        const validModuleTypes = ["Vehicle", "DoorBell", "SmartCard", "LostFound"];
        if (!validModuleTypes.includes(moduleType)) {
            throw new Error("invalid_module_type");
        }

        const pricing = await Pricing.findOneAndUpdate(
            { moduleType },
            { basePrice, bulkDiscounts, downloadPrice, isActive: true },
            { upsert: true, new: true, runValidators: true }
        );
        return pricing;
    };

    getPricing = async (moduleType: string) => {
        const pricing = await Pricing.findOne({ moduleType, isActive: true });
        if (!pricing) throw new Error("pricing_not_found");
        return pricing;
    };

    getAllPricing = async () => {
        return await Pricing.find({ isActive: true }).sort({ moduleType: 1 }).lean();
    };

    calculatePrice = async (moduleType: string, quantity: number, priceType: "basePrice" | "downloadPrice" = "basePrice") => {
        const pricing = await this.getPricing(moduleType);

        if (priceType === "downloadPrice") {
            const totalAmount = pricing.downloadPrice * quantity;

            return {
                downloadPrice: pricing.downloadPrice,
                pricePerUnit: Number(pricing.downloadPrice.toFixed(2)),
                discountPercentage: 0,
                quantity,
                totalAmount: Number(totalAmount.toFixed(2))
            }
        } else {
            let discountPercentage = 0;

            // Find applicable bulk discount
            for (const discount of pricing.bulkDiscounts) {
                if (quantity >= discount.minQuantity) {
                    if (!discount.maxQuantity || quantity <= discount.maxQuantity) {
                        discountPercentage = discount.discountPercentage;
                    }
                }
            }

            const pricePerUnit = pricing.basePrice * (1 - discountPercentage / 100);
            const totalAmount = pricePerUnit * quantity;

            return {
                basePrice: pricing.basePrice,
                pricePerUnit: Number(pricePerUnit.toFixed(2)),
                quantity,
                discountPercentage,
                totalAmount: Number(totalAmount.toFixed(2))
            };
        }
    };
    calculatePriceForDirectOrder = async (moduleType: string, quantity: number, priceType: "basePrice" | "downloadPrice" = "basePrice") => {
        const pricing = await this.getPricing(moduleType);

        if (priceType === "downloadPrice") {
            const totalAmount = pricing.downloadPrice * quantity;

             // Calculate GST (18% = 9% CGST + 9% SGST)
            const cgst = Math.ceil(totalAmount * 0.09);
            const sgst = Math.ceil(totalAmount * 0.09);

            // Calculate delivery fee (₹100 if PURCHASE/REORDER and subtotal < ₹2000, else free)
            const deliveryFee = 0;

            // Final total = subtotal + CGST + SGST + delivery fee
            const finalTotal = totalAmount + cgst + sgst + deliveryFee;

            return {
                downloadPrice: pricing.downloadPrice,
                pricePerUnit: Number(pricing.downloadPrice.toFixed(2)),
                discountPercentage: 0,
                quantity,
                cgst,
                sgst,
                deliveryFee,
                totalAmount: finalTotal,
            }
        } else {
            let discountPercentage = 0;

            // Find applicable bulk discount
            for (const discount of pricing.bulkDiscounts) {
                if (quantity >= discount.minQuantity) {
                    if (!discount.maxQuantity || quantity <= discount.maxQuantity) {
                        discountPercentage = discount.discountPercentage;
                    }
                }
            }

            const pricePerUnit = pricing.basePrice * (1 - discountPercentage / 100);
            const totalAmount = pricePerUnit * quantity;

            // Calculate GST (18% = 9% CGST + 9% SGST)
            const cgst = Math.ceil(totalAmount * 0.09);
            const sgst = Math.ceil(totalAmount * 0.09);

            // Calculate delivery fee (₹100 if PURCHASE/REORDER and subtotal < ₹2000, else free)
            const deliveryFee = priceType === 'basePrice' && totalAmount < 2000 ? 100 : 0;

            // Final total = subtotal + CGST + SGST + delivery fee
            const finalTotal = totalAmount + cgst + sgst + deliveryFee;

            return {
                basePrice: pricing.basePrice,
                pricePerUnit: Number(pricePerUnit.toFixed(2)),
                quantity,
                discountPercentage,
                cgst,
                sgst,
                deliveryFee,
                totalAmount: finalTotal,
            };
        }
    };


    calculateCart = async (items: any[], orderType: 'PURCHASE' | 'DOWNLOAD' = 'PURCHASE') => {
        let totalAmount = 0;

        for (const item of items) {
            const { moduleType } = item;
            let quantity = item.quantity;

            // Reserve fresh QR codes from inventory for both PURCHASE and DOWNLOAD
            const availableQRs = await QR.countDocuments({
                qrType: "Physical",
                moduleType,
                status: "CREATED",
                ownerId: null
            });

            if (availableQRs < quantity) {
                throw new Error(`insufficient_qr_stock_${moduleType}: only ${availableQRs} available`);
            }

            // Calculate price - fixed ₹50 for downloads, bulk pricing for purchases
            let pricePerUnit: number;
            let discountPercentage = 0;

            if (orderType === 'DOWNLOAD') {
                const priceDetails = await this.calculatePrice(moduleType, quantity, "downloadPrice");
                pricePerUnit = priceDetails.pricePerUnit;
                discountPercentage = priceDetails.discountPercentage;
            } else {
                const priceDetails = await this.calculatePrice(moduleType, quantity, "basePrice");
                pricePerUnit = priceDetails.pricePerUnit;
                discountPercentage = priceDetails.discountPercentage;
            }

            const subtotal = pricePerUnit * quantity;

            totalAmount += subtotal;
        }
        return {
            totalAmount: Number(totalAmount.toFixed(2)),
        };
    }

    deletePricing = async (moduleType: string) => {
        const pricing = await Pricing.findOneAndUpdate(
            { moduleType },
            { isActive: false },
            { new: true }
        );
        if (!pricing) throw new Error("pricing_not_found");
        return pricing;
    };
}
