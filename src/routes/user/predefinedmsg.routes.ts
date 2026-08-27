import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { container } from "tsyringe";
import { PredefinedMessageController } from "../../controllers/predefinedmsg.controller";

const router = Router();
// const vehicleController = new VehicleController();
const predefinedMessageController = container.resolve(PredefinedMessageController);

// Apply auth middleware to all routes
router.use(authenticate);

// Predefined message routes (Premium feature)
router.post("/messages", predefinedMessageController.createPredefinedMessage);
router.post("/messages/list", predefinedMessageController.getPredefinedMessages);
router.patch("/messages", predefinedMessageController.updatePredefinedMessage);
router.delete("/messages", predefinedMessageController.deletePredefinedMessage);


export default router;