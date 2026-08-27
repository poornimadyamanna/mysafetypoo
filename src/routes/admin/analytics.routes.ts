import { Router } from 'express';
import { AnalyticsController } from '../../controllers/analytics.controller';
import { authenticateAdmin } from '../../middlewares/admin.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

router.use(authenticateAdmin);

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/modules', analyticsController.getModuleStats);
router.get('/users/growth', analyticsController.getUserGrowth);
router.get('/revenue/growth', analyticsController.getRevenueGrowth);
router.get('/qr/usage', analyticsController.getQRUsageStats);
router.get('/calls', analyticsController.getCallStats);
router.get('/users/top', analyticsController.getTopUsers);
router.get('/subscriptions', analyticsController.getSubscriptionStats);

export default router;
