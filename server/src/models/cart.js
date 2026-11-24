import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  items: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantKey: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  }],
}, { timestamps: true });

export const Cart = mongoose.model('Cart', cartSchema);
