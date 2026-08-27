import { Router } from 'express';
import { authenticateAdmin } from '../../middlewares/admin.middleware';
import { AdminSmartCardLinksController } from '../../controllers/admin/smartcardLinks.controller';
import { container } from 'tsyringe';
import { DocumentController } from '../../controllers/document.controller';

const router = Router();
const subscriptionController = new AdminSmartCardLinksController();
const documentController = container.resolve(DocumentController);

router.use(authenticateAdmin);

router.get('/', subscriptionController.getAllLinks);
router.post('/', subscriptionController.createLink);
router.patch('/', subscriptionController.updateLink);
router.delete('/', subscriptionController.deleteLink);

router.post("/upload", documentController.uploadDocument);

export default router;
