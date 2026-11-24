import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  label: String,
  at: { type: Date, default: Date.now },
  by: { type: String, default: '' },
}, { _id: false });

const payoutSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
  sellerUserId: { type: String, required: true },
  storeName: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'BDT' },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  reference: { type: String, required: true, unique: true },
  // Payouts are always simulated in portfolio mode — no bank transfer is made.
  method: { type: String, default: 'manual-simulation' },
  simulated: { type: Boolean, default: true },
  note: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  processedAt: Date,
  timeline: { type: [eventSchema], default: [] },
}, { timestamps: true });

payoutSchema.index({ sellerId: 1, createdAt: -1 });
payoutSchema.index({ status: 1, createdAt: -1 });

export const Payout = mongoose.model('Payout', payoutSchema);
