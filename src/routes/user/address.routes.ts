import { Router } from 'express';
import { AddressController } from '../../controllers/address.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const addressController = new AddressController();

router.use(authenticate);

router.post('/', addressController.createAddress);
router.get('/', addressController.getUserAddresses);
router.get('/default', addressController.getDefaultAddress);
router.post('/details', addressController.getAddressById);
router.put('/', addressController.updateAddress);
router.delete('/', addressController.deleteAddress);

export default router;
