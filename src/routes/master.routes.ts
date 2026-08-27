import { Router } from "express";
import { MasterController } from "../controllers/master.controller";
import { MapsController } from "../controllers/maps.controller";
import { container } from "tsyringe";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const masterController = container.resolve(MasterController);
const mapsController = container.resolve(MapsController);

router.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
router.get("/content", masterController.getContent);
router.get("/modules", masterController.getModules);
// router.post("/modules", masterController.createModules);
router.get("/languages", masterController.getLanguages);
router.post("/get-address", mapsController.getAddress);
router.post("/place-autocomplete", mapsController.getAutocomplete);

export default router;
