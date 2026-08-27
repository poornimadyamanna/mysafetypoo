import { Router } from 'express';
import { container } from 'tsyringe';
import { DeviceTokenController } from '../../controllers/devicetoken.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const deviceTokenController = container.resolve(DeviceTokenController);

router.post('/register', authenticate, deviceTokenController.registerDevice);
router.delete('/remove', authenticate, deviceTokenController.removeDevice);

export default router;
