import { injectable, inject } from "tsyringe";
import { Order } from "../models/Order";
import { QR } from "../models/QR";
import { PricingService } from "./pricing.service";
import { Transaction } from "../models/Transaction";
import { schedulePaymentTimeout } from "../queues/payment-timeout.queue";
import logger from "../config/logger";

@injectable()
export class OrderService {
    constructor(@inject(PricingService) private pricingService: PricingService) { }
    generateOrderNumber = () => {
        return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    };

    createOrder = async (userId: string, items: any[], orderType: 'PURCHASE' | 'DOWNLOAD' | 'REORDER' = 'PURCHASE', addressId?: string) => {
        const orderItems = [];
        let totalAmount = 0;

        // Handle REORDER type
        if (orderType === 'REORDER') {
            const { quantity, reorderQrId } = items[0];
            if (!reorderQrId || items.length !== 1) {
                throw new Error("reorder_requires_single_item_and_qrId");
            }

            const userQR = await QR.findOne({
                _id: reorderQrId,
                ownerId: userId,
                status: "ACTIVE",
                qrType: "Physical"
            });

            if (!userQR) {
                throw new Error("invalid_qr_selection");
            }

            const moduleType = userQR.moduleType;
            const priceDetails = await this.pricingService.calculatePrice(moduleType!, quantity, 'basePrice');

            orderItems.push({
                moduleType,
                quantity,
                pricePerUnit: priceDetails.pricePerUnit,
                discountPercentage: priceDetails.discountPercentage,
                subtotal: priceDetails.totalAmount,
                qrIds: [reorderQrId]
            });

            totalAmount = priceDetails.totalAmount;
        } else {
            // Handle PURCHASE and DOWNLOAD types
            for (const item of items) {
                const { moduleType } = item;
                let quantity = item.quantity;
                let qrIds: any[] = [];

                // Reserve fresh QR codes from inventory
                const availableQRs = await QR.countDocuments({
                    qrType: "Physical",
                    moduleType,
                    status: "CREATED",
                    ownerId: null
                });

                if (availableQRs < quantity) {
                    throw new Error(`insufficient_qr_stock_${moduleType}: only ${availableQRs} available`);
                }

                const qrsToReserve = await QR.find({
                    qrType: "Physical",
                    moduleType,
                    status: "CREATED",
                    ownerId: null
                }).limit(quantity).select('_id');

                qrIds = qrsToReserve.map(qr => qr._id);
                await QR.updateMany(
                    { _id: { $in: qrIds } },
                    { status: "ORDERED", ownerId: userId }
                );

                const priceType = orderType === 'DOWNLOAD' ? 'downloadPrice' : 'basePrice';
                const priceDetails = await this.pricingService.calculatePrice(moduleType, quantity, priceType);
                const subtotal = priceDetails.pricePerUnit * quantity;

                orderItems.push({
                    moduleType,
                    quantity: item.quantity,
                    pricePerUnit: priceDetails.pricePerUnit,
                    discountPercentage: priceDetails.discountPercentage,
                    subtotal,
                    qrIds
                });

                totalAmount += subtotal;
            }
        }

        // Calculate GST (18% = 9% CGST + 9% SGST)
        const cgst = Math.ceil(totalAmount * 0.09);
        const sgst = Math.ceil(totalAmount * 0.09);

        // Calculate delivery fee (₹100 if PURCHASE/REORDER and subtotal < ₹2000, else free)
        const deliveryFee = (orderType === 'PURCHASE' || orderType === 'REORDER') && totalAmount < 2000 ? 100 : 0;

        // Final total = subtotal + CGST + SGST + delivery fee
        const finalTotal = totalAmount + cgst + sgst + deliveryFee;

        const order = await Order.create({
            userId,
            orderNumber: this.generateOrderNumber(),
            items: orderItems,
            subtotal: totalAmount,
            cgst,
            sgst,
            deliveryFee,
            totalAmount: finalTotal,
            addressId: (orderType === 'PURCHASE' || orderType === 'REORDER') ? addressId : undefined,
            orderType
        });

        return order;
    };

    updatePaymentStatus = async (orderId: string, paymentStatus: string, transactionId?: string, paymentMethod?: string) => {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("order_not_found");

        order.paymentStatus = paymentStatus as any;
        if (transactionId) order.transactionId = transactionId;
        if (paymentMethod) order.paymentMethod = paymentMethod;

        if (paymentStatus === "Completed") {
            // Create transaction record only if amount > 0
            if (order.totalAmount > 0) {
                const transactionType = order.orderType === 'DOWNLOAD' ? 'DOWNLOAD_PAYMENT' : 'QR_PURCHASE';
                await Transaction.create({
                    userId: order.userId,
                    transactionType,
                    amount: order.totalAmount,
                    currency: 'INR',
                    status: 'SUCCESS',
                    paymentMethod: paymentMethod || 'unknown',
                    transactionId: transactionId || `TXN-${Date.now()}`,
                    orderId: order._id
                });
            }

            // Auto-fulfill DOWNLOAD orders immediately
            if (order.orderType === 'DOWNLOAD') {
                for (const item of order.items) {
                    await QR.updateMany(
                        { _id: { $in: item.qrIds }, status: { $ne: "ACTIVE" } },
                        { status: "DELIVERED" }
                    );
                }
                order.orderStatus = "Completed";
            } else {
                order.orderStatus = "Processing";
            }
        }

        await order.save();
        return order;
    };

    fulfillOrder = async (orderId: string) => {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("order_not_found");
        if (order.paymentStatus !== "Completed") throw new Error("payment_not_completed");
        if (order.orderStatus === "Completed") throw new Error("order_already_fulfilled");

        // Update QR status to DELIVERED only for non-ACTIVE QRs
        for (const item of order.items) {
            await QR.updateMany(
                { _id: { $in: item.qrIds }, status: { $ne: "ACTIVE" } },
                { status: "DELIVERED" }
            );
        }

        order.orderStatus = "Completed";
        await order.save();

        return order;
    };

    getUserOrders = async (userId: string, filters: any = {}) => {
        const { page = 1, limit = 10, type } = filters;

        const query: any = { userId };

        if (type === 'processing') {
            query.orderStatus = { $in: ['Pending', 'Processing'] };
        } else if (type === 'past') {
            query.orderStatus = { $in: ['Completed', 'Cancelled'] };
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate('addressId')
                .lean(),
            Order.countDocuments(query)
        ]);

        return {
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    };

    getOrderById = async (orderId: string) => {
        const order = await Order.findById(orderId)
            .populate("userId", "name email mobile")
            .populate("addressId")
            .lean();
        if (!order) throw new Error("order_not_found");
        return order;
    };

    getAllOrders = async (filters: any = {}) => {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = filters;

        const query: any = {};
        if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
        if (filters.orderStatus) query.orderStatus = filters.orderStatus;
        if (filters.userId) query.userId = filters.userId;
        if (search) query.orderNumber = { $regex: search, $options: 'i' };

        const skip = (page - 1) * limit;
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [data, total] = await Promise.all([
            Order.find(query)
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .populate("userId", "name email mobile")
                .populate("addressId")
                .lean(),
            Order.countDocuments(query)
        ]);

        return {
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    };

    updateOrderStatus = async (orderId: string, orderStatus: string) => {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("order_not_found");
        order.orderStatus = orderStatus as any;
        await order.save();
        return order;
    };

    cancelOrder = async (orderId: string) => {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("order_not_found");
        if (order.orderStatus === "Completed") throw new Error("cannot_cancel_completed_order");

        // Release only non-ACTIVE QRs (don't touch already activated QRs)
        for (const item of order.items) {
            await QR.updateMany(
                { _id: { $in: item.qrIds }, status: { $ne: "ACTIVE" } },
                { status: "CREATED", ownerId: null }
            );
        }

        order.orderStatus = "Cancelled";
        await order.save();
        return order;
    };

    downloadOrderQRs = async (userId: string, orderId: string) => {
        const order = await Order.findById(orderId).populate({
            path: 'items.qrIds',
            select: 'qrId moduleType status'
        }).lean();

        if (!order) throw new Error("order_not_found");
        if (order.userId.toString() != userId) throw new Error("unauthorized");
        if (order.orderStatus !== "Completed") throw new Error("order_not_completed");

        const qrs = [];
        for (const item of order.items) {
            for (const qr of item.qrIds as any[]) {
                qrs.push({
                    qrId: qr.qrId,
                    moduleType: qr.moduleType,
                    status: qr.status,
                    downloadUrl: `${process.env.APP_BASE_URL}${qr.qrId}`
                });
            }
        }

        return { ...order, orderNumber: order.orderNumber, qrs };
    };

    getAvailableQRInventory = async () => {
        const inventory = await QR.aggregate([
            {
                $match: {
                    status: "CREATED",
                    ownerId: null
                }
            },
            {
                $group: {
                    _id: {
                        qrType: "$qrType",
                        moduleType: "$moduleType"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "pricings",
                    localField: "_id.moduleType",
                    foreignField: "moduleType",
                    as: "moduleInfo"
                }
            },
            {
                $unwind: {
                    path: "$moduleInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    qrType: "$_id.qrType",
                    moduleType: "$_id.moduleType",
                    availableCount: "$count",
                    inventoryImage: "$moduleInfo.inventoryImage",
                    moduleImage: "$moduleInfo.moduleImage"
                }
            },
            {
                $sort: { moduleType: 1, qrType: 1 }
            }
        ]);

        return inventory;
    };

    updateRazorpayOrderId = async (orderId: string, razorpayOrderId: string) => {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("order_not_found");
        order.razorpayOrderId = razorpayOrderId as any;
        await order.save();

        // Schedule payment timeout (5 minutes from now) - non-blocking
        try {
            await schedulePaymentTimeout(orderId, new Date());
        } catch (error) {
            logger.error('[Payment Timeout] Failed to schedule:', error);
            // Continue without blocking the order creation
        }

        return order;
    };

    getOrderByRazorpayOrderId = async (razorpayOrderId: string) => {
        return await Order.findOne({ razorpayOrderId });
    };

    getOrderStatistics = async () => {
        const [totalOrders, completedOrders, pendingOrders, cancelledOrders, revenueResult] = await Promise.all([
            Order.countDocuments({}),
            Order.countDocuments({ orderStatus: "Completed" }),
            Order.countDocuments({ orderStatus: "Pending" }),
            Order.countDocuments({ orderStatus: "Cancelled" }),
            Order.aggregate([
                { $match: { orderStatus: "Completed", paymentStatus: "Completed" } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ])
        ]);

        const totalRevenue = revenueResult[0]?.total || 0;

        return {
            totalOrders,
            completedOrders,
            pendingOrders,
            cancelledOrders,
            totalRevenue
        };
    };

    refundOrder = async (orderId: string, refundAmount?: number, reason?: string) => {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("order_not_found");
        if (order.paymentStatus === "Refunded") throw new Error("order_already_refunded");
        if (order.paymentStatus !== "Completed") throw new Error("order_not_paid");

        const amountToRefund = refundAmount || order.totalAmount;
        if (amountToRefund > order.totalAmount) throw new Error("refund_amount_exceeds_order_total");

        // Update order status
        order.paymentStatus = "Refunded";
        await order.save();

        // Create refund transaction record
        if (order.totalAmount > 0) {
            await Transaction.create({
                userId: order.userId,
                transactionType: order.orderType === 'DOWNLOAD' ? 'DOWNLOAD_PAYMENT' : 'QR_PURCHASE',
                amount: -amountToRefund,
                currency: 'INR',
                status: 'SUCCESS',
                paymentMethod: order.paymentMethod || 'Razorpay',
                transactionId: `REFUND-${order.transactionId}-${Date.now()}`,
                orderId: order._id,
                metadata: { reason, originalTransactionId: order.transactionId }
            });
        }

        // Release QRs back to inventory (only non-ACTIVE ones)
        for (const item of order.items) {
            await QR.updateMany(
                { _id: { $in: item.qrIds }, status: { $ne: "ACTIVE" } },
                { status: "CREATED", ownerId: null }
            );
        }

        return order;
    };

    retryPayment = async (orderId: string) => {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("order_not_found");
        if (order.paymentStatus === "Completed") throw new Error("order_already_paid");
        if (order.orderStatus === "Cancelled") throw new Error("order_cancelled");

        // Reset razorpayOrderId to allow new payment attempt
        order.razorpayOrderId = undefined as any;
        order.paymentStatus = "Pending" as any;
        await order.save();

        return order;
    };

    cancelExpiredOrder = async (orderId: string) => {
        const order = await Order.findById(orderId);
        if (!order) return;

        // Only cancel if still pending payment
        if (order.paymentStatus !== "Pending" || order.orderStatus !== "Pending") return;

        // Release QRs back to inventory
        for (const item of order.items) {
            await QR.updateMany(
                { _id: { $in: item.qrIds }, status: { $ne: "ACTIVE" } },
                { status: "CREATED", ownerId: null }
            );
        }

        // Mark order as cancelled
        order.orderStatus = "Cancelled" as any;
        await order.save();
    };
}
