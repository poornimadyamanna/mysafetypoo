import { Response } from 'express';
import { container } from 'tsyringe';
import { TransactionService } from '../../services/admin/transaction.service';
import { errorResponse, successResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export class TransactionController {
    private transactionService = container.resolve(TransactionService);

    getTransactions = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { page = 1, limit = 20, search, transactionType, status, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.body;

            const result = await this.transactionService.getTransactions({
                page: Number(page),
                limit: Number(limit),
                search,
                transactionType,
                status,
                startDate,
                endDate,
                sortBy,
                sortOrder
            });

            return await successResponse(req, res, 'transactions_retrieved', result);
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };

    getTransactionDetails = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.body;

            if (!id || typeof id !== 'string') {
                return await errorResponse(req, res, 'invalid_transaction_id', 400);
            }

            const transaction = await this.transactionService.getTransactionDetails(id);

            if (!transaction) {
                return await errorResponse(req, res, 'transaction_not_found', 404);
            }

            return await successResponse(req, res, 'transaction_details_retrieved', { transaction });
        } catch (error: any) {
            return await errorResponse(req, res, error.message, 500);
        }
    };
}
