import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { VehicleController } from "../../controllers/vehicle.controller";
import { VehicleContactMappingController } from "../../controllers/vehicle-contact-mapping.controller";
import { VehicleDriverMappingController } from "../../controllers/vehicle-driver-mapping.controller";
import { container } from "tsyringe";

const router = Router();
const vehicleController = new VehicleController();
const vehicleContactMappingController = container.resolve(VehicleContactMappingController);
const vehicleDriverMappingController = container.resolve(VehicleDriverMappingController);

// Apply auth middleware to all routes
router.use(authenticate);

// router.post("/", vehicleController.createVehicle);

router.post("/fetch", vehicleController.fetchAndCreateVehicle);
router.post("/manual", vehicleController.createManualVehicle);
router.post("/challan", vehicleController.getChallan);
router.get("/", vehicleController.getVehicles);
router.post("/details", vehicleController.getVehicleDetails);
router.delete("/", vehicleController.deleteVehicle);

// router.patch("/", vehicleController.updateVehicle);

router.get("/alerts", vehicleController.getAlerts);
router.post("/alerts/resolve", vehicleController.resolveAlert);



// Predefined message routes (Premium feature)
// router.post("/messages", vehicleController.createPredefinedMessage);
// router.post("/messages/list", vehicleController.getPredefinedMessages);
// router.patch("/messages", vehicleController.updatePredefinedMessage);
// router.delete("/messages", vehicleController.deletePredefinedMessage);

// Vehicle-Contact mapping routes
router.post("/contacts", vehicleContactMappingController.manageContacts);
router.post("/contacts/list", vehicleContactMappingController.getVehicleContacts);

// Vehicle-Driver mapping routes
router.post("/driver", vehicleDriverMappingController.mapDriver);
router.delete("/driver", vehicleDriverMappingController.unmapDriver);
router.post("/driver/details", vehicleDriverMappingController.getVehicleDriver);

router.post("/rc/verify", vehicleController.verifyRc);

export default router;