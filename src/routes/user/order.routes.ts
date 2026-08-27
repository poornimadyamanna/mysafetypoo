import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { container } from "tsyringe";
import { OrderController } from "../../controllers/order.controller";
import { CartController } from "../../controllers/cart.controller";

const router = Router();
const orderController = container.resolve(OrderController);
const cartController = new CartController();

// Webhook route (no auth)
router.post("/razorpay/webhook", orderController.razorpayWebhook);

router.use(authenticate);

// Cart routes
router.post("/cart", cartController.getCart);
router.post("/cart/add", cartController.addOrUpdateCart);
router.delete("/cart", cartController.clearCart);

router.get("/inventory", orderController.getAvailableInventory);
router.post("/", orderController.createOrder);
// router.patch("/payment", orderController.updatePaymentStatus);
router.post("/list", orderController.getUserOrders);
router.post("/orderById", orderController.getOrderById);
router.post("/download", orderController.downloadOrderQRs);
router.post("/cancel", orderController.cancelOrder);

router.post("/razorpay/create", orderController.createRazorpayOrder);
router.post("/razorpay/verify", orderController.verifyRazorpayPayment);
router.post("/razorpay/status", orderController.checkPaymentStatus);

router.post("/refund", orderController.refundOrder);
router.post("/retry-payment", orderController.retryPayment);

export default router;
