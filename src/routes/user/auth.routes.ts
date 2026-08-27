import { Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../../controllers/auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();
const authController = container.resolve(AuthController);

router.post("/sendOtp", authController.sendOtp);
router.post("/verifyOtpAndLogin", authController.verifyOtpAndLogin);
router.post("/googleSSO", authController.googleSSO);
router.post("/appleSSO", authController.appleSSO);
router.get("/refreshToken", authenticate, authController.refreshToken);
router.get("/logout", authenticate, authController.logout);


export default router;
