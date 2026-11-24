import mongoose from 'mongoose';
import { PAYMENT_GATEWAYS, PAYMENT_MODES, PAYMENT_STATUSES } from '../utils/payments.js';

const eventSchema = new mongoose.Schema({
  label: String,
  at: { type: Date, default: Date.now },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  buyerId: { type: String, required: true, index: true },
  gateway: { type: String, enum: PAYMENT_GATEWAYS, required: true },
  // simulated = portfolio/demo or SSL sandbox; offline = COD; live = real gateway.
  mode: { type: String, enum: PAYMENT_MODES, default: 'simulated' },
  method: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'BDT' },
  transactionId: { type: String, default: null },
  checkoutToken: { type: String, default: null },
  tokenExpiresAt: Date,
  idempotencyKey: { type: String, default: null },
  valId: { type: String, default: '' },
  status: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
  failureReason: { type: String, default: '' },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  timeline: { type: [eventSchema], default: [] },
  processedAt: Date,
  refund: {
    status: String,
    amount: Number,
    note: String,
    at: Date,
    by: String,
  },
}, { timestamps: true });

paymentSchema.index({ transactionId: 1 }, { unique: true, partialFilterExpression: { transactionId: { $type: 'string' } } });
paymentSchema.index({ checkoutToken: 1 }, { unique: true, partialFilterExpression: { checkoutToken: { $type: 'string' } } });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
// At most one pending payment per order and gateway — this is the core duplicate guard.
paymentSchema.index({ orderId: 1, gateway: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
paymentSchema.index({ buyerId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
