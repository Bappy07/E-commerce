import { User } from '../models/user.js';
import { SellerProfile } from '../models/seller-profile.js';
import { Product } from '../models/product.js';
import { Category } from '../models/category.js';
import { Order } from '../models/order.js';
import { Payment } from '../models/payment.js';
import { Review } from '../models/review.js';
import { Setting } from '../models/setting.js';
import { ApiError, asyncHandler, ok, pagination, round2 } from '../utils/api.js';
import { uniqueSlug, escapeText } from '../utils/common.js';
import { userView, storeView, productView, orderView, paymentView } from '../utils/serialize.js';
import { notify } from '../services/marketplace.js';
import { refundPaymentRecord, settleCodPayment } from '../services/payments.js';
import {
  createPayout as requestPayout, listPayouts as fetchPayouts, marketplaceFinance,
  updatePayout as changePayout,
} from '../services/finance.js';
import { deleteImages } from '../config/cloudinary.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const overview = asyncHandler(async (_req, res) => {
  const [users, sellers, products, orders, revenue, pendingApplications] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    SellerProfile.countDocuments({ status: 'active' }),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' }, commission: { $sum: '$commissionTotal' } } }]),
    SellerProfile.countDocuments({ status: 'pending' }),
  ]);
  const roles = Object.fromEntries(users.map((row) => [row._id || 'buyer', row.count]));
  ok(res, {
    buyers: roles.buyer || 0, sellers, admins: roles.admin || 0, products, orders, pendingApplications,
    revenue: round2(revenue[0]?.total || 0), commission: round2(revenue[0]?.commission || 0),
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (['buyer', 'seller', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.$or = [{ name: { $regex: escapeRegex(req.query.search), $options: 'i' } }, { email: { $regex: escapeRegex(req.query.search), $options: 'i' } }];
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  ok(res, items.map(userView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (req.body.status) user.status = req.body.status;
  if (req.body.role) user.role = req.body.role;
  await user.save();
  if (req.body.status === 'suspended') await SellerProfile.updateOne({ userId: String(user._id) }, { $set: { status: 'suspended' } });
  await notify(String(user._id), 'Account updated', `Your account status is now ${user.status}`, 'system');
  ok(res, userView(user), 'User updated');
});

export const listSellers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.storeName = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([
    SellerProfile.find(filter).populate('userId', 'name email image role').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SellerProfile.countDocuments(filter),
  ]);
  ok(res, items.map(storeView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const updateSeller = asyncHandler(async (req, res) => {
  const store = await SellerProfile.findById(req.params.id);
  if (!store) throw new ApiError(404, 'Seller not found');
  if (!req.body.status) throw new ApiError(400, 'Status is required');
  store.status = req.body.status;
  await store.save();
  await User.updateOne({ _id: store.userId }, { $set: { status: req.body.status === 'suspended' ? 'suspended' : 'active' } });
  await notify(store.userId, 'Store status updated', `Your store is now ${store.status}`, 'system');
  ok(res, storeView(store), 'Seller updated');
});

export const listApplications = asyncHandler(async (_req, res) => {
  const items = await SellerProfile.find({ 'application.submittedAt': { $exists: true } })
    .populate('userId', 'name email image').sort({ 'application.submittedAt': -1 }).lean();
  ok(res, items.map(storeView));
});

export const decideApplication = asyncHandler(async (req, res) => {
  const profile = await SellerProfile.findById(req.params.id);
  if (!profile) throw new ApiError(404, 'Application not found');
  const approved = req.body.decision === 'approve';
  profile.status = approved ? 'active' : 'rejected';
  profile.application.reviewedAt = new Date();
  profile.application.reviewedBy = req.user.id;
  profile.application.note = req.body.note;
  await profile.save();
  if (approved) await User.updateOne({ _id: profile.userId }, { $set: { role: 'seller', status: 'active' } });
  await notify(profile.userId, approved ? 'Application approved' : 'Application rejected', approved ? 'You can now add products to your store.' : req.body.note || 'Please review and reapply.', 'application', '/dashboard/seller');
  ok(res, storeView(profile), `Application ${approved ? 'approved' : 'rejected'}`);
});

export const listCategories = asyncHandler(async (_req, res) => ok(res, await Category.find().sort({ name: 1 }).lean()));

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({ ...req.body, name: escapeText(req.body.name), description: escapeText(req.body.description || ''), slug: await uniqueSlug(req.body.name, Category) });
  ok(res, category, 'Category created', 201);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  Object.assign(category, req.body);
  await category.save();
  ok(res, category, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const used = await Product.countDocuments({ categoryId: req.params.id });
  if (used) throw new ApiError(409, `Move ${used} products before deleting this category`);
  await Category.findByIdAndDelete(req.params.id);
  ok(res, null, 'Category deleted');
});

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.approved === 'true') filter.approved = true;
  if (req.query.approved === 'false') filter.approved = false;
  if (req.query.search) filter.title = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name').populate('sellerId', 'storeName slug').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  ok(res, items.map(productView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  Object.assign(product, req.body);
  await product.save();
  ok(res, productView(product), 'Product updated');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  await deleteImages(product.images.map((image) => image.publicId).filter(Boolean)).catch(() => {});
  await product.deleteOne();
  ok(res, null, 'Product deleted');
});

export const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.orderNumber = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  ok(res, items.map(orderView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  // Refunds must go through the payment record so finance and order state stay in sync.
  if (req.body.status === 'refunded') {
    throw new ApiError(409, 'Use the refund endpoint on the payment record to refund an order');
  }
  order.status = req.body.status;
  if (['delivered', 'cancelled'].includes(req.body.status)) {
    order.items.forEach((item) => { item.sellerStatus = req.body.status === 'delivered' ? 'delivered' : 'cancelled'; });
  }
  order.timeline.push({ label: `Admin set ${req.body.status}`, at: new Date() });
  await order.save();
  ok(res, orderView(order), 'Order updated');
});

export const updateDelivery = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (req.body.status) {
    order.delivery.status = req.body.status;
    if (req.body.status === 'shipped') order.delivery.shippedAt = new Date();
    if (req.body.status === 'delivered') order.delivery.deliveredAt = new Date();
    order.timeline.push({ label: `Delivery ${req.body.status}`, at: new Date() });
  }
  if (req.body.note) order.delivery.note = req.body.note;
  if (req.body.paymentCollected === true) {
    const settled = await settleCodPayment(order._id, { collectedBy: req.user.id, note: req.body.note });
    ok(res, orderView(settled.order), 'Cash collection confirmed');
    return;
  }
  await order.save();
  ok(res, orderView(order), 'Delivery updated');
});

export const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (['pending', 'paid', 'failed', 'cancelled', 'refunded'].includes(req.query.status)) filter.status = req.query.status;
  if (['mock', 'cod', 'sslcommerz'].includes(req.query.gateway)) filter.gateway = req.query.gateway;
  if (req.query.search) filter.transactionId = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([
    Payment.find(filter).populate('orderId', 'orderNumber').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  ok(res, items.map(paymentView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');
  const result = await refundPaymentRecord(payment, {
    note: req.body.note || 'Refund simulated by admin',
    adminId: req.user.id,
  });
  ok(res, paymentView(result.payment), 'Refund simulated');
});

export const finance = asyncHandler(async (_req, res) => ok(res, await marketplaceFinance()));

export const listPayouts = asyncHandler(async (req, res) => {
  const result = await fetchPayouts(req.query);
  ok(res, result.data, null, 200, result.meta);
});

export const createPayout = asyncHandler(async (req, res) => {
  const payout = await requestPayout({
    sellerId: req.body.sellerId,
    amount: req.body.amount,
    note: req.body.note,
    adminId: req.user.id,
  });
  ok(res, payout, 'Payout requested (simulation only)', 201);
});

export const updatePayout = asyncHandler(async (req, res) => {
  const payout = await changePayout(req.params.id, { status: req.body.status, note: req.body.note, adminId: req.user.id });
  ok(res, payout, `Payout ${payout.status}`);
});

export const commissions = asyncHandler(async (_req, res) => {
  const orders = await Order.find({ paymentStatus: 'paid' }).lean();
  const rows = orders.flatMap((order) => order.items.map((item) => ({
    orderNumber: order.orderNumber, date: order.createdAt, sellerId: item.sellerId,
    title: item.title, subtotal: item.subtotal, commission: item.commission, sellerEarning: item.sellerEarning,
  })));
  ok(res, { rows, total: round2(rows.reduce((sum, row) => sum + row.commission, 0)) });
});

export const analytics = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const since = new Date(); since.setDate(since.getDate() - days);
  const [orders, topProducts, topStores] = await Promise.all([
    Order.find({ createdAt: { $gte: since } }).lean(),
    Product.find().sort({ sold: -1 }).limit(5).select('title sold price').lean(),
    SellerProfile.find({ status: 'active' }).sort({ 'stats.totalSales': -1 }).limit(5).select('storeName stats').lean(),
  ]);
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(); date.setDate(date.getDate() - i);
    buckets.set(date.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  orders.forEach((order) => {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key) || { revenue: 0, orders: 0 };
    bucket.orders += 1;
    if (order.paymentStatus === 'paid') bucket.revenue = round2(bucket.revenue + order.total);
    buckets.set(key, bucket);
  });
  const byStatus = orders.reduce((acc, order) => ({ ...acc, [order.status]: (acc[order.status] || 0) + 1 }), {});
  ok(res, { series: [...buckets].map(([date, values]) => ({ date, ...values })), byStatus, topProducts, topStores });
});

export const getSettings = asyncHandler(async (_req, res) => {
  const stored = await Setting.findOne({ key: 'marketplace' }).lean();
  ok(res, stored?.value || {});
});

export const updateSettings = asyncHandler(async (req, res) => {
  await Setting.findOneAndUpdate({ key: 'marketplace' }, { $set: { value: req.body } }, { upsert: true });
  ok(res, req.body, 'Settings saved');
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  ok(res, null, 'Review deleted');
});
