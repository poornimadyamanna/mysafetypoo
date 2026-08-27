import { Router } from "express";
import { container } from "tsyringe";
import { UserController } from "../../controllers/user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { DriverController } from "../../controllers/driver.controller";
import { MemberController } from "../../controllers/member.controller";
import { VehicleEmergencyContactController } from "../../controllers/vehicle-emergency-contact.controller";

const router = Router();
const userController = container.resolve(UserController);
const memberController = container.resolve(MemberController);
const driverController = container.resolve(DriverController);
const vehicleEmergencyContactController = container.resolve(VehicleEmergencyContactController);

router.get("/profile", authenticate, userController.getProfile);
router.patch("/profile", authenticate, userController.updateProfile);

router.get("/member", authenticate, memberController.getMembers);
router.post("/member", authenticate, memberController.addMember);
router.patch("/member", authenticate, memberController.updateMember);
router.delete("/member", authenticate, memberController.deleteMember);

router.get("/driver", authenticate, driverController.getDrivers);
router.post("/driver", authenticate, driverController.addDriver);
router.patch("/driver", authenticate, driverController.updateDriver);
router.delete("/driver", authenticate, driverController.deleteDriver);

router.get("/emergency-contact", authenticate, vehicleEmergencyContactController.getContacts);
router.post("/emergency-contact", authenticate, vehicleEmergencyContactController.addContact);
router.patch("/emergency-contact", authenticate, vehicleEmergencyContactController.updateContact);
router.delete("/emergency-contact", authenticate, vehicleEmergencyContactController.deleteContact);

export default router;
