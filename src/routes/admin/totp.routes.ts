import { Router } from 'express';
import { TOTPController } from '../../controllers/totp.controller';
import { authenticateAdmin } from '../../middlewares/admin.middleware';

const router = Router();

router.use(authenticateAdmin);

router.get('/setup', TOTPController.setupTwoFactor);
router.post('/enable', TOTPController.enableTwoFactor);
router.post('/disable', TOTPController.disableTwoFactor);
router.post('/verify-backup', TOTPController.verifyBackupCode);
router.get('/qr-code', TOTPController.getQRCode);

export default router;
