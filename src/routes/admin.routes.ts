import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
// import { authMiddleware } from "../middlewares/auth.middleware";
import { authenticateAdmin } from "../middlewares/admin.middleware";
import authRoutes from "./admin/auth.routes";
import userRoutes from "./admin/user.routes";
import qrRoutes from "./admin/qr.routes";
import orderRoutes from "./admin/order.routes";
import pricingRoutes from "./admin/pricing.routes";
import totpRoutes from "./admin/totp.routes";
import analyticsRoutes from "./admin/analytics.routes";
import smartcardLinksRoutes from "./admin/smartcardLinks.routes";
import subscriptionRoutes from "./admin/subscription.routes";
import transactionRoutes from "./admin/transaction.routes";
import predefinedMessageRoutes from "./admin/predefinedmsg.routes";
import contentRoutes from "./admin/content.routes";
import audioRoutes from "./admin/audio.routes";
import logsRoutes from "./admin/logs.routes";
import lostfoundRoutes from "./admin/lostfound.routes";

const router = Router();

// Apply auth and admin middleware to all routes
// router.use(authMiddleware);
// router.use(authenticateAdmin);

// User management routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/qr", qrRoutes);
router.use("/orders", orderRoutes);
router.use("/pricing", pricingRoutes);
router.use("/totp", totpRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/smartcardLinks", smartcardLinksRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/transactions", transactionRoutes);
router.use("/predefinedmsg", predefinedMessageRoutes);
router.use("/content", contentRoutes);
router.use("/audio", audioRoutes);
router.use("/logs", logsRoutes);
router.use("/lostfound", lostfoundRoutes);

export default router;