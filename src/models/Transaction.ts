import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  transactionType: 'QR_PURCHASE' | 'DOWNLOAD_PAYMENT' | 'SUBSCRIPTION_PAYMENT';
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  transactionId: string;
  orderId?: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  houseId?: mongoose.Types.ObjectId;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  transactionType: { 
    type: String, 
    enum: ['QR_PURCHASE', 'DOWNLOAD_PAYMENT', 'SUBSCRIPTION_PAYMENT'], 
    required: true 
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { 
    type: String, 
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], 
    default: 'PENDING',
    index: true
  },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String, required: true, unique: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  houseId: { type: Schema.Types.ObjectId, ref: 'House' },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
