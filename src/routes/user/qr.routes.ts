import { Router } from "express";
import { QRController } from "../../controllers/qr.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();
const qrController = new QRController();

router.use(authenticate);
// User routes - QR Management
router.post("/assign", qrController.assignQR);
router.get("/my-qrs", qrController.getMyQRs);
router.get("/purchased", qrController.getPurchasedQRs);
router.post("/suspend", qrController.suspendQR);
router.post("/reactivate", qrController.reactivateQR);

export default router;
