import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '', maxlength: 5000 },
  brand: { type: String, default: '' },
  images: [{ url: { type: String, required: true }, publicId: { type: String, default: '' } }],
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, default: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  variants: { type: [variantSchema], default: [] },
  sku: { type: String, default: '' },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  approved: { type: Boolean, default: true, index: true },
  featured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
}, { timestamps: true });

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
export const Product = mongoose.model('Product', productSchema);
