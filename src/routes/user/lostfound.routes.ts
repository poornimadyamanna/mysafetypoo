import { Router } from "express";
import { DoorbellController } from "../../controllers/doorbell.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { LostFoundController } from "../../controllers/lostfound.controller";
import { checkFeatureAccess } from "../../middlewares/checkFeatureAccess";

const router = Router();
const lostFoundController = new LostFoundController();

// Apply auth middleware to all routes
router.use(authenticate);

router.post("/", lostFoundController.createItem);
router.get("/", lostFoundController.getItems);
router.patch("/", lostFoundController.updateItem);
router.delete("/", lostFoundController.deleteItem);
router.get("/events", lostFoundController.getEvents);
router.post("/events/status", lostFoundController.updateEventStatus);



// House member management routes (Premium feature)
router.post("/members/manage", checkFeatureAccess('LostFound', 'family_members'), lostFoundController.manageHouseMembers);
router.post("/members/get", lostFoundController.getHouseMembers);
router.post("/members/reassign-frozen", lostFoundController.reassignFrozenMembers);

export default router;