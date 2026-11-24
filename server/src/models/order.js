import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
  title: String,
  image: String,
  variantKey: String,
  variantName: String,
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  commission: { type: Number, required: true },
  sellerEarning: { type: Number, required: true },
  sellerStatus: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  // COD is collected per seller because a single order can contain several stores.
  codCollected: { type: Boolean, default: false },
  codCollectedAt: Date,
  reviewed: { type: Boolean, default: false },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  buyerId: { type: String, required: true, index: true },
  items: { type: [itemSchema], required: true },
  address: {
    name: String, phone: String, line1: String, line2: String,
    city: String, district: String, postalCode: String, country: String,
  },
  note: { type: String, default: '' },
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cod', 'mock', 'sslcommerz'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
  commissionTotal: { type: Number, default: 0 },
  sellerEarningTotal: { type: Number, default: 0 },
  platformRevenue: { type: Number, default: 0 },
  delivery: {
    status: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    shippedAt: Date,
    deliveredAt: Date,
    paymentCollected: { type: Boolean, default: false },
    collectedAt: Date,
    collectedBy: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  timeline: [{ label: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

orderSchema.index({ buyerId: 1, createdAt: -1 });
export const Order = mongoose.model('Order', orderSchema);
