import { Router } from 'express';
import { RazorpayWebhookController } from '../controllers/razorpay-webhook.controller';

const router = Router();
const webhookController = new RazorpayWebhookController();

router.post('/razorpay', webhookController.handleWebhook);

export default router;
