import { injectable } from 'tsyringe';
import { Transaction } from '../../models/Transaction';

interface TransactionFilters {
    page: number;
    limit: number;
    search?: string;
    transactionType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
}

@injectable()
export class TransactionService {
    getTransactions = async (filters: TransactionFilters) => {
        const { page, limit, search, transactionType, status, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

        const query: any = {};

        // Filter by transaction type
        if (transactionType) {
            query.transactionType = transactionType;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search by transaction ID or user details
        if (search) {
            query.$or = [
                { transactionId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const sortOptions: any = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('userId', 'name email phone')
                .populate('orderId', 'orderNumber')
                .populate('subscriptionId', 'plan status')
                .populate('houseId', 'houseName')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Transaction.countDocuments(query)
        ]);

        return {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    };

    getTransactionDetails = async (transactionId: string) => {
        const transaction = await Transaction.findById(transactionId)
            .populate('userId', 'name email phone')
            .populate('orderId')
            .populate('subscriptionId')
            .populate('houseId')
            .lean();

        return transaction;
    };
}
