import { Review } from '../models/review.js';
import { Product } from '../models/product.js';
import { Order } from '../models/order.js';
import { ApiError, asyncHandler, ok, round2 } from '../utils/api.js';
import { escapeText } from '../utils/common.js';

async function recalculate(productId) {
  const stats = await Review.aggregate([
    { $match: { productId, status: 'visible' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { $set: { 'rating.average': round2(stats[0]?.average || 0), 'rating.count': stats[0]?.count || 0 } },
  );
}

export const listReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ productId: req.params.productId, status: 'visible' })
    .populate('userId', 'name image').sort({ createdAt: -1 }).limit(50).lean();
  ok(res, reviews);
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment } = req.body;
  const product = await Product.exists({ _id: productId, approved: true });
  if (!product) throw new ApiError(404, 'Product not found');
  if (orderId) {
    const order = await Order.findOne({ _id: orderId, buyerId: req.user.id, status: 'delivered', items: { $elemMatch: { productId } } });
    if (!order) throw new ApiError(400, 'Only a delivered purchase can be reviewed');
    await Order.updateOne({ _id: orderId, 'items.productId': productId }, { $set: { 'items.$.reviewed': true } });
  }
  let review;
  try {
    review = await Review.create({ productId, orderId: orderId || null, userId: req.user.id, rating, comment: escapeText(comment) });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You have already reviewed this product');
    throw error;
  }
  await recalculate(productId);
  ok(res, review, 'Review posted', 201);
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.userId !== req.user.id && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');
  await review.deleteOne();
  await recalculate(review.productId);
  ok(res, null, 'Review deleted');
});
