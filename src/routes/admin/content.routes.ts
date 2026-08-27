import { Router } from "express";
// import { authenticate } from "../../middlewares/auth.middleware";
import { container } from "tsyringe";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { ContentController } from "../../controllers/admin/content.controller";

const router = Router();
// const vehicleController = new VehicleController();
const contentController = container.resolve(ContentController);

// Apply auth middleware to all routes
// router.use(authenticateAdmin);

// Predefined message routes (Premium feature)
// router.post("/terms", contentController.createContent);
router.get("/", contentController.getContent);
router.patch("/", contentController.updateContent);
// router.delete("/terms", contentController.deleteContent);


export default router;