import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { container } from "tsyringe";
import { OrderController } from "../../controllers/order.controller";

const router = Router();
const orderController = container.resolve(OrderController);

router.use(authenticateAdmin);

router.get("/statistics", orderController.getOrderStatistics);
router.get("/inventory", orderController.getAvailableInventory);
router.post("/list", orderController.getAllOrders);
router.post("/details", orderController.getOrderById);
router.put("/status", orderController.updateOrderStatus);
router.put("/fulfill", orderController.fulfillOrder);
router.put("/payment", orderController.updatePaymentStatus);

export default router;
