import mongoose from 'mongoose';

const sellerProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  storeName: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '', trim: true },
  logo: { type: String, default: '' },
  banner: { type: String, default: '' },
  contact: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  status: { type: String, enum: ['pending', 'active', 'suspended', 'rejected'], default: 'pending' },
  application: {
    message: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: String,
    note: String,
  },
  stats: { totalSales: { type: Number, default: 0 }, totalOrders: { type: Number, default: 0 }, rating: { type: Number, default: 0 } },
}, { timestamps: true });

export const SellerProfile = mongoose.model('SellerProfile', sellerProfileSchema);
