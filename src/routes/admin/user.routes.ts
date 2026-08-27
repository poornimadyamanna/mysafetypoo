import { Router } from "express";
import { AdminController } from "../../controllers/admin.controller";
// import { authMiddleware } from "../middlewares/auth.middleware";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { container } from "tsyringe";

const router = Router();
const adminController = container.resolve(AdminController);

// Apply auth and admin middleware to all routes
// router.use(authMiddleware);
router.use(authenticateAdmin);

// User management routes
router.post("/", adminController.getAllUsers);
router.patch("/", adminController.updateUser);
router.post("/details", adminController.getUserById);
router.patch("/toggle-status", adminController.toggleUserStatus);

export default router;