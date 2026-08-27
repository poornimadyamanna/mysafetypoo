import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { container } from "tsyringe";
import { PricingController } from "../../controllers/pricing.controller";

const router = Router();
const pricingController = container.resolve(PricingController);

router.use(authenticateAdmin);

router.post("/", pricingController.createOrUpdatePricing);
router.get("/", pricingController.getAllPricing);
router.post("/details", pricingController.getPricing);
router.delete("/", pricingController.deletePricing);

export default router;
