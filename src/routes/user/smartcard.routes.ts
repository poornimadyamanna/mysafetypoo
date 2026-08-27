import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { SmartCardController } from "../../controllers/smartcard.controller";
import { checkFeatureAccess } from "../../middlewares/checkFeatureAccess";
import { AdminSmartCardLinksController } from "../../controllers/admin/smartcardLinks.controller";

const router = Router();
const smartCardController = new SmartCardController();
const smartCardLinksController = new AdminSmartCardLinksController();

// Apply auth middleware to all routes
router.use(authenticate);


router.post("/", smartCardController.createSmartCard);
router.get("/", smartCardController.getSmartCards);
router.get("/masterLinks", smartCardLinksController.getAllLinks);
router.patch("/links", checkFeatureAccess('SmartCard', 'links_available'), smartCardController.updateSmartCardLinks);
router.patch("/", smartCardController.updateSmartCard);
router.patch("/toggleActiveLink", smartCardController.toggleActiveLink);
router.delete("/", smartCardController.deleteSmartCard);
router.get("/analytics", smartCardController.getAnalytics);

export default router;