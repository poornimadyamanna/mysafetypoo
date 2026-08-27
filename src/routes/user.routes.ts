import { Router } from "express";
import { container } from "tsyringe";
import authRoutes from './user/auth.routes';
import documentRoutes from "./user/document.routes";
import doorbellRoutes from "./user/doorbell.routes";
import vehicleRoutes from "./user/vehicle.routes";
import uploadRoutes from "./user/upload.routes";
import qrRoutes from "./user/qr.routes";
import scanRoutes from "./user/scan.routes";
import userRoutes from "./user/user.routes";
import smartCardRoutes from "./user/smartcard.routes";
import lostFoundRoutes from "./user/lostfound.routes";
import predefinedMsgRoutes from "./user/predefinedmsg.routes";
import orderRoutes from "./user/order.routes";
import pricingRoutes from "./user/pricing.routes";
import subscriptionRoutes from "./user/subscription.routes";
import callRoutes from "./user/call.routes";
import addressRoutes from "./user/address.routes";
import blockedVisitorRoutes from "./user/blockedvisitor.routes";
import deviceTokenRoutes from "./user/devicetoken.routes";

const router = Router();

router.use('/', userRoutes);
router.use('/auth', authRoutes);

router.use('/document', documentRoutes);
router.use('/doorbell', doorbellRoutes);
router.use('/vehicle', vehicleRoutes);
router.use('/smartcard', smartCardRoutes);
router.use('/lostfound', lostFoundRoutes);

router.use('/predefinedmsg', predefinedMsgRoutes);

router.use("/files", uploadRoutes);
router.use("/qr", qrRoutes);
router.use("/scan", scanRoutes);
router.use("/orders", orderRoutes);
router.use("/pricing", pricingRoutes);
router.use("/subscription", subscriptionRoutes);
router.use("/call", callRoutes);
router.use("/address", addressRoutes);
router.use("/blocked-visitors", blockedVisitorRoutes);
router.use("/device", deviceTokenRoutes);

export default router;
