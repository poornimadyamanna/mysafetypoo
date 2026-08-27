import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { UploadController } from "../../controllers/upload.controller";

const router = Router();
const uploadController = container.resolve(UploadController);

const upload = multer(); // You can customize multer config here if needed

router.post("/upload", upload.single("file"), uploadController.uploadFile);

export default router;
