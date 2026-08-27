import { Router } from "express";
import { container } from "tsyringe";
import { PricingController } from "../../controllers/pricing.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();
const pricingController = container.resolve(PricingController);
router.use(authenticate);
router.get("/", pricingController.getAllPricing);
router.get("/:moduleType", pricingController.getPricing);
router.post("/calculate", pricingController.calculatePrice);

export default router;
