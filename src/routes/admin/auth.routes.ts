import { Router } from "express";
import { AdminController } from "../../controllers/admin.controller";
// import { authMiddleware } from "../middlewares/auth.middleware";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { container } from "tsyringe";
import { AuthController } from "../../controllers/auth.controller";

const router = Router();
const authController = container.resolve(AuthController);

// Apply auth and admin middleware to all routes
// router.use(authMiddleware);
router.post("/login", authController.adminLogin);
router.get("/logout", authenticateAdmin, authController.logout);

export default router;