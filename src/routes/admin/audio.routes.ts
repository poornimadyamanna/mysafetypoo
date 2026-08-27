import { Router } from "express";
// import { authenticate } from "../../middlewares/auth.middleware";
import { container } from "tsyringe";
import { authenticateAdmin } from "../../middlewares/admin.middleware";
import { PredefinedMessageController } from "../../controllers/admin/predefinedmsg.controller";
import { AudioController } from "../../controllers/admin/audio.controller";

const router = Router();
// const vehicleController = new VehicleController();
const audioController = container.resolve(AudioController);

// Apply auth middleware to all routes
router.use(authenticateAdmin);

// Predefined message routes (Premium feature)
router.get("/", audioController.getAllAudioRecordings);
router.post("/", audioController.createAudioRecording);
router.patch("/", audioController.updateAudioRecording);
router.delete("/", audioController.deleteAudioRecording);


export default router;