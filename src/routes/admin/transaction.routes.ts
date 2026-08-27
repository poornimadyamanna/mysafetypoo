import { Router } from 'express';
import { TransactionController } from '../../controllers/admin/transaction.controller';
import { authenticateAdmin } from '../../middlewares/admin.middleware';

const router = Router();
const transactionController = new TransactionController();

router.use(authenticateAdmin);

router.post('/list', transactionController.getTransactions);
router.post('/details', transactionController.getTransactionDetails);

export default router;
