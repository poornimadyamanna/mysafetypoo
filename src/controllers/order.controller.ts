import { Request, Response } from "express";
import { container } from "tsyringe";
import { OrderService } from "../services/order.service";
import { RazorpayService } from "../services/razorpay.service";
import { errorResponse, successResponse } from "../utils/response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export class OrderController {
    private orderService = container.resolve(OrderService);
    private razorpayService = new RazorpayService();

    createOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { items, orderType, addressId } = req.body;
            const order = await this.orderService.createOrder(userId, items, orderType, addressId);
            return successResponse(req, res, "order_created", order);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    updatePaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // const { orderId } = req.params;
            const { orderId, paymentStatus, transactionId, paymentMethod } = req.body;
            const order = await this.orderService.updatePaymentStatus(orderId, paymentStatus, transactionId, paymentMethod);
            return successResponse(req, res, "payment_status_updated", order);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    fulfillOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId } = req.body;
            const order = await this.orderService.fulfillOrder(orderId);
            return successResponse(req, res, "order_fulfilled", order);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const orders = await this.orderService.getUserOrders(userId, req.body);
            return successResponse(req, res, "orders_retrieved", orders);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getOrderById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId } = req.body;
            const order = await this.orderService.getOrderById(orderId);
            return successResponse(req, res, "order_retrieved", order);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getAllOrders = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const orders = await this.orderService.getAllOrders(req.body);
            return successResponse(req, res, "orders_retrieved", orders);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId, orderStatus } = req.body;
            const order = await this.orderService.updateOrderStatus(orderId, orderStatus);
            return successResponse(req, res, "order_status_updated", order);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId } = req.body;
            const order = await this.orderService.cancelOrder(orderId);
            return successResponse(req, res, "order_cancelled", order);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getAvailableInventory = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const inventory = await this.orderService.getAvailableQRInventory();
            return successResponse(req, res, "inventory_retrieved", inventory);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    getOrderStatistics = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const statistics = await this.orderService.getOrderStatistics();
            return successResponse(req, res, "statistics_retrieved", statistics);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    downloadOrderQRs = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { orderId } = req.body;
            const qrs = await this.orderService.downloadOrderQRs(userId, orderId);
            return successResponse(req, res, "qrs_retrieved", qrs);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    createRazorpayOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId } = req.body;
            const order = await this.orderService.getOrderById(orderId);

            if (order.userId._id.toString() != req.user._id.toString()) {
                return errorResponse(req, res, "unauthorized", 403);
            }
            if (order.paymentStatus === "Completed") {
                return errorResponse(req, res, "payment_already_completed", 400);
            }

            const razorpayOrder = await this.razorpayService.createOrder(
                order.totalAmount,
                'INR',
                order.orderNumber
            );

            await this.orderService.updateRazorpayOrderId(orderId, razorpayOrder.id);

            return successResponse(req, res, "razorpay_order_created", {
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                orderId: order._id
            });
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    verifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

            const isValid = this.razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

            if (!isValid) {
                return errorResponse(req, res, "invalid_payment_signature", 400);
            }

            const order = await this.orderService.updatePaymentStatus(
                orderId,
                "Completed",
                razorpayPaymentId,
                "Razorpay"
            );

            return successResponse(req, res, "payment_verified", order);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    checkPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId } = req.body;
            const order = await this.orderService.getOrderById(orderId);

            if (order.userId.toString() !== req.user._id.toString()) {
                return errorResponse(req, res, "unauthorized", 403);
            }

            if (order.paymentStatus === "Completed") {
                return successResponse(req, res, "payment_already_completed", order);
            }

            if (!order.razorpayOrderId) {
                return successResponse(req, res, "payment_not_initiated", { status: "Pending", order });
            }

            // Fetch all payments for this Razorpay order
            const payments = await this.razorpayService.fetchPaymentsByOrderId(order.razorpayOrderId);

            if (payments.count === 0) {
                return successResponse(req, res, "payment_pending", { status: "Pending", order });
            }

            // Get the latest payment
            const latestPayment = payments.items[0];

            if (latestPayment.status === "captured" || latestPayment.status === "authorized") {
                const updatedOrder = await this.orderService.updatePaymentStatus(
                    orderId,
                    "Completed",
                    latestPayment.id,
                    "Razorpay"
                );
                return successResponse(req, res, "payment_completed", updatedOrder);
            }

            return successResponse(req, res, "payment_status_fetched", { status: latestPayment.status, order });
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    razorpayWebhook = async (req: Request, res: Response) => {
        try {
            const webhookSignature = req.headers['x-razorpay-signature'] as string;
            const webhookBody = JSON.stringify(req.body);

            const isValid = this.razorpayService.verifyWebhookSignature(webhookBody, webhookSignature);

            if (!isValid) {
                return res.status(400).json({ error: "invalid_webhook_signature" });
            }

            const event = req.body.event;
            const payload = req.body.payload.payment.entity;

            if (event === "payment.captured" || event === "payment.authorized") {
                const order = await this.orderService.getOrderByRazorpayOrderId(payload.order_id);

                if (order && order.paymentStatus !== "Completed") {
                    await this.orderService.updatePaymentStatus(
                        order._id.toString(),
                        "Completed",
                        payload.id,
                        "Razorpay"
                    );
                }
            } else if (event === "payment.failed") {
                const order = await this.orderService.getOrderByRazorpayOrderId(payload.order_id);

                if (order && order.paymentStatus === "Pending") {
                    await this.orderService.updatePaymentStatus(
                        order._id.toString(),
                        "Failed",
                        payload.id,
                        "Razorpay"
                    );
                }
            }

            return res.status(200).json({ status: "ok" });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    };

    refundOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId, refundAmount, reason } = req.body;

            const order = await this.orderService.getOrderById(orderId);

            // Only admin or order owner can refund
            if (order.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
                return errorResponse(req, res, "unauthorized", 403);
            }

            // Process Razorpay refund if payment was made
            if (order.transactionId) {
                await this.razorpayService.refundPayment(order.transactionId, refundAmount);
            }

            const refundedOrder = await this.orderService.refundOrder(orderId, refundAmount, reason);
            return successResponse(req, res, "order_refunded", refundedOrder);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };

    retryPayment = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId } = req.body;
            const order = await this.orderService.getOrderById(orderId);

            if (order.userId.toString() !== req.user._id.toString()) {
                return errorResponse(req, res, "unauthorized", 403);
            }

            const resetOrder = await this.orderService.retryPayment(orderId);
            return successResponse(req, res, "payment_retry_ready", resetOrder);
        } catch (error: any) {
            return errorResponse(req, res, error.message, 400);
        }
    };
}
