import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
}, { timestamps: true });

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
export const Review = mongoose.model('Review', reviewSchema);
