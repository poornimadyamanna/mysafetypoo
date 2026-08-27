import { Router } from "express";
import { DocumentController } from "../../controllers/document.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { container } from "tsyringe";

const router = Router();
const documentController = container.resolve(DocumentController);
// const documentController = new DocumentController();

router.get("/digilocker/callback", documentController.digilockerCallback);

// Apply auth middleware to all routes
router.use(authenticate);

// Document CRUD routes
router.get("/categories", documentController.getCategories);
router.post("/upload", documentController.uploadDocument);
router.get("/documents", documentController.getDocuments);
// router.get("/documentByCategory", documentController.getDocumentsByCategory);
// router.patch("/update", documentController.updateDocument);
router.delete("/delete", documentController.deleteDocument);

// DigiLocker integration
router.get("/digilocker/connect", documentController.digilockerConnect);
router.get("/digilocker/documents", documentController.getDigiLockerDocuments);
router.post("/digilocker/:category", documentController.linkDigiLocker);











// --------- NEW: Sandbox demo partner APIs ---------

// Pull PAN via Pull Document + File APIs
router.post("/digilocker/demo/pull-pan", documentController.digilockerDemoPullPan);

// List issued docs for the sandbox token
router.get("/digilocker/demo/issued", documentController.digilockerDemoIssued);

// Get file from given URI
router.get("/digilocker/demo/file", documentController.digilockerDemoGetFile);

// Get e-Aadhaar XML
router.get("/digilocker/demo/eaadhaar", documentController.digilockerDemoEAadhaar);

export default router;