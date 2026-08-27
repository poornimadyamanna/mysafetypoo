import { Cart } from '../models/Cart';
import { QR } from '../models/QR';
import { PricingService } from './pricing.service';

export class CartService {
    private pricingService = new PricingService();

    async addOrUpdateCart(userId: string, moduleType: string, quantity: number, orderType: 'PURCHASE' | 'DOWNLOAD' = 'PURCHASE') {
        let cart = await Cart.findOne({ userId, orderType });

        // Calculate final quantity after update
        let finalQuantity = quantity;
        if (cart) {
            const existingItem = cart.items.find(item => item.moduleType === moduleType);
            if (existingItem) {
                finalQuantity = existingItem.quantity + quantity;
            }
        }

        // Check inventory availability if final quantity is positive
        if (finalQuantity > 0) {
            const availableQRs = await QR.countDocuments({
                qrType: "Physical",
                moduleType,
                status: "CREATED",
                ownerId: null
            });

            if (availableQRs < finalQuantity) {
                throw new Error(`insufficient_qr_stock_${moduleType}: only ${availableQRs} available`);
            }
        }

        const newItem = { moduleType, quantity };

        if (!cart) {
            cart = await Cart.create({
                userId,
                items: [newItem],
                orderType
            });
        } else {
            const existingItemIndex = cart.items.findIndex(item => item.moduleType === moduleType);

            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += quantity;
                
                // Remove item if quantity is 0 or negative
                if (cart.items[existingItemIndex].quantity <= 0) {
                    cart.items.splice(existingItemIndex, 1);
                }
            } else {
                // Only add new item if quantity is positive
                if (quantity > 0) {
                    cart.items.push(newItem);
                }
            }

            await cart.save();
        }

        return await this.getCart(userId, orderType);
    }

    async getCart(userId: string, orderType: 'PURCHASE' | 'DOWNLOAD' = 'PURCHASE') {
        const cart = await Cart.findOne({ userId, orderType }).lean();

        if (!cart || cart.items.length === 0) {
            return {
                userId,
                items: [],
                totalItems: 0,
                subtotal: 0,
                cgst: 0,
                sgst: 0,
                deliveryFee: 0,
                totalAmount: 0,
                orderType
            };
        }

        // Calculate prices using PricingService.calculateCart
        const cartCalculation = await this.pricingService.calculateCart(cart.items, cart.orderType);

        // Calculate individual item prices
        const itemsWithPrices = await Promise.all(
            cart.items.map(async (item) => {
                const priceType = cart.orderType === 'DOWNLOAD' ? 'downloadPrice' : 'basePrice';
                const priceDetails = await this.pricingService.calculatePrice(
                    item.moduleType,
                    item.quantity,
                    priceType
                );
                return {
                    moduleType: item.moduleType,
                    quantity: item.quantity,
                    pricePerUnit: priceDetails.pricePerUnit,
                    subtotal: priceDetails.totalAmount,
                    discountPercentage: priceDetails.discountPercentage
                };
            })
        );

        const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = cartCalculation.totalAmount;
        
        // Calculate GST (18% = 9% CGST + 9% SGST)
        const cgst = Math.ceil(subtotal * 0.09);
        const sgst = Math.ceil(subtotal * 0.09);
        
        // Calculate delivery fee (₹100 if PURCHASE and subtotal < ₹2000, else free)
        const deliveryFee = cart.orderType === 'PURCHASE' && subtotal < 2000 ? 100 : 0;
        
        // Final total = subtotal + CGST + SGST + delivery fee
        const totalAmount = subtotal + cgst + sgst + deliveryFee;

        return {
            _id: cart._id,
            userId: cart.userId,
            items: itemsWithPrices,
            totalItems,
            subtotal,
            cgst,
            sgst,
            deliveryFee,
            totalAmount,
            orderType: cart.orderType,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt
        };
    }

    async clearCart(userId: string, orderType: 'PURCHASE' | 'DOWNLOAD') {
        await Cart.findOneAndUpdate(
            { userId, orderType },
            { items: [] },
            { upsert: true }
        );
    }
}
