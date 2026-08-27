import { Router } from "express";
import { container } from "tsyringe";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { LostFoundController } from "../../controllers/admin/lostfound.controller";

const router = Router();
// const vehicleController = new VehicleController();
const audioController = container.resolve(LostFoundController);

// Apply auth middleware to all routes
router.use(authenticateAdmin);

// Predefined message routes (Premium feature)
router.post("/", audioController.getAllLostFounds);
// router.post("/", audioController.createLostFoundRecording);
// router.patch("/", audioController.updateLostFoundRecording);
// router.delete("/", audioController.deleteLostFoundRecording);


export default router;