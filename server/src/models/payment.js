import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  buyerId: { type: String, required: true, index: true },
  gateway: { type: String, enum: ['sslcommerz', 'cod'], required: true },
  method: { type: String, default: '' },
  amount: { type: Number, required: true },
  transactionId: { type: String, default: null },
  valId: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'], default: 'pending' },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  processedAt: Date,
  refund: { status: String, amount: Number, note: String, at: Date },
}, { timestamps: true });

paymentSchema.index({ transactionId: 1 }, { unique: true, partialFilterExpression: { transactionId: { $type: 'string' } } });
export const Payment = mongoose.model('Payment', paymentSchema);
