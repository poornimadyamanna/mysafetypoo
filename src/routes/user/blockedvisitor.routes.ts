import { Router } from "express";
import { BlockedVisitorController } from "../../controllers/blockedvisitor.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();
const controller = new BlockedVisitorController();
router.use(authenticate)
router.post("/block", controller.blockVisitor);
router.post("/unblock", controller.unblockVisitor);
router.post("/list", controller.getBlockedVisitors);

export default router;
