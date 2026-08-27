import { Router } from 'express';
import { AdminSubscriptionController } from '../../controllers/admin/subscription.controller';
import { authenticateAdmin } from '../../middlewares/admin.middleware';

const router = Router();
const subscriptionController = new AdminSubscriptionController();

// router.use(authenticateAdmin);

router.get('/', subscriptionController.getAllPlans);
router.post('/', subscriptionController.createPlan);
router.patch('/', subscriptionController.updatePlan);
router.delete('/', subscriptionController.deletePlan);

export default router;
