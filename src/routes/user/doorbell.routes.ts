import { Router } from "express";
import { DoorbellController } from "../../controllers/doorbell.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { checkFeatureAccess } from "../../middlewares/checkFeatureAccess";

const router = Router();
const doorbellController = new DoorbellController();

// Apply auth middleware to all routes
router.use(authenticate);

// House management routes
router.post("/", doorbellController.createHouse);
router.get("/", doorbellController.getHouses);
router.patch("/", doorbellController.updateHouse);
router.delete("/", doorbellController.deleteHouse);

//visitor info
router.get("/visits", doorbellController.getVisits);

// House member management routes (Premium feature)
router.post("/members/manage", checkFeatureAccess('DoorBell', 'family_members'), doorbellController.manageHouseMembers);
router.post("/members/get", doorbellController.getHouseMembers);
router.post("/members/reassign-frozen", doorbellController.reassignFrozenMembers);

// QR Kit generation
router.post("/qr-kit", doorbellController.generateQRKit);

export default router;