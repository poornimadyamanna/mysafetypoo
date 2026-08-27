import { Router } from 'express';
import { SubscriptionController } from '../../controllers/subscription.controller';
import { RazorpayWebhookController } from '../../controllers/razorpay-webhook.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const subscriptionController = new SubscriptionController();
const webhookController = new RazorpayWebhookController();

// Webhook route (no auth required - called by Razorpay)
router.post('/webhook', webhookController.handleWebhook);

router.use(authenticate);

router.get('/', subscriptionController.getMySubscription);
router.get('/plans', subscriptionController.getAvailablePlans);
router.get('/sync-status', subscriptionController.syncSubscriptionStatus);
router.post('/initiate', subscriptionController.initiateSubscription);
router.post('/verify-payment', subscriptionController.verifySubscriptionPayment);
router.post('/cancel', subscriptionController.cancelSubscription);

export default router;
