import { Router } from "express";
import { container } from "tsyringe";
import { QRController } from "../../controllers/qr.controller";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { verifyTOTP } from "../../middlewares/verifyTOTP";

const router = Router();
const qrController = container.resolve(QRController);

// Apply auth and admin middleware to all routes
// router.use(authMiddleware);
router.use(authenticateAdmin);

// User management routes
router.post("/generate-batch", verifyTOTP, qrController.generateBatch);
router.post("/inventory", qrController.getInventory);
router.post("/inventoryByBatchNo", qrController.getInventoryByBatch);
router.get("/inventoryCounts", qrController.getInventoryCounts);

export default router;