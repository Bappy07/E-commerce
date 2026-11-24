import { SellerProfile } from '../models/seller-profile.js';
import { Product } from '../models/product.js';
import { Order } from '../models/order.js';
import { Category } from '../models/category.js';
import { ApiError, asyncHandler, ok, pagination, round2 } from '../utils/api.js';
import { uniqueSlug, slugify, escapeText } from '../utils/common.js';
import { sellerFilter } from '../middleware/auth.js';
import { productView, storeView, orderView } from '../utils/serialize.js';
import { deleteImages } from '../config/cloudinary.js';

export const getMyStore = asyncHandler(async (req, res) => {
  const store = await SellerProfile.findOne({ userId: req.user.id }).populate('userId', 'name email image');
  if (!store) throw new ApiError(404, 'Seller store not found');
  ok(res, storeView(store));
});

export const updateMyStore = asyncHandler(async (req, res) => {
  const store = await SellerProfile.findOne({ userId: req.user.id });
  if (!store) throw new ApiError(404, 'Seller store not found');
  const { storeName, description, logo, banner, contact } = req.body;
  if (storeName) store.storeName = escapeText(storeName);
  if (description !== undefined) store.description = escapeText(description);
  if (logo !== undefined) store.logo = logo;
  if (banner !== undefined) store.banner = banner;
  if (contact) Object.assign(store.contact, contact);
  await store.save();
  ok(res, storeView(store), 'Store updated');
});

async function ownedProduct(req) {
  const sellerId = await sellerFilter(req);
  const product = await Product.findOne({ _id: req.params.id, sellerId });
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeVariants(variants = []) {
  const seen = new Set();
  return variants.map((variant) => {
    const key = variant.key || slugify(variant.name) || `variant-${seen.size + 1}`;
    if (seen.has(key)) throw new ApiError(400, 'Variant names must be unique');
    seen.add(key);
    return { ...variant, key };
  });
}

export const listMyProducts = asyncHandler(async (req, res) => {
  const sellerId = await sellerFilter(req);
  const { page, limit, skip } = pagination(req.query);
  const filter = { sellerId };
  if (req.query.search) filter.title = { $regex: escapeRegex(req.query.search), $options: 'i' };
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  ok(res, items.map(productView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const sellerId = await sellerFilter(req);
  const category = await Category.exists({ _id: req.body.categoryId, active: true });
  if (!category) throw new ApiError(400, 'Category not found');
  const product = await Product.create({
    ...req.body,
    sellerId,
    title: escapeText(req.body.title),
    description: escapeText(req.body.description),
    variants: normalizeVariants(req.body.variants),
    slug: await uniqueSlug(req.body.title, Product),
    approved: true,
  });
  ok(res, productView(product), 'Product created', 201);
});

export const getMyProduct = asyncHandler(async (req, res) => {
  ok(res, productView(await ownedProduct(req)));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await ownedProduct(req);
  if (req.body.categoryId) {
    const category = await Category.exists({ _id: req.body.categoryId, active: true });
    if (!category) throw new ApiError(400, 'Category not found');
  }
  const oldPublicIds = product.images.map((image) => image.publicId).filter(Boolean);
  Object.assign(product, {
    ...req.body,
    title: req.body.title ? escapeText(req.body.title) : product.title,
    description: req.body.description !== undefined ? escapeText(req.body.description) : product.description,
    variants: normalizeVariants(req.body.variants || product.variants),
  });
  await product.save();
  const kept = new Set((product.images || []).map((image) => image.publicId));
  const removed = oldPublicIds.filter((id) => !kept.has(id));
  if (removed.length) await deleteImages(removed).catch(() => {});
  ok(res, productView(product), 'Product updated');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await ownedProduct(req);
  await deleteImages(product.images.map((image) => image.publicId).filter(Boolean)).catch(() => {});
  await product.deleteOne();
  ok(res, null, 'Product deleted');
});

export const updateInventory = asyncHandler(async (req, res) => {
  const product = await ownedProduct(req);
  if (req.body.variantKey) {
    const variant = product.variants.find((v) => v.key === req.body.variantKey);
    if (!variant) throw new ApiError(404, 'Variant not found');
    variant.stock = req.body.variantStock;
  } else product.stock = req.body.stock;
  await product.save();
  ok(res, productView(product), 'Inventory updated');
});

export const listSellerOrders = asyncHandler(async (req, res) => {
  const sellerId = await sellerFilter(req);
  const { page, limit, skip } = pagination(req.query);
  const filter = { items: { $elemMatch: { sellerId } } };
  if (req.query.status) filter.status = req.query.status;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  const data = orders.map((order) => {
    const view = orderView(order);
    view.items = view.items.filter((item) => String(item.sellerId) === String(sellerId));
    view.myTotal = round2(view.items.reduce((sum, item) => sum + item.subtotal, 0));
    return view;
  });
  ok(res, data, null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const updateSellerOrderItem = asyncHandler(async (req, res) => {
  const sellerId = await sellerFilter(req);
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  const item = order.items.id(req.params.itemId);
  if (!item || String(item.sellerId) !== String(sellerId)) throw new ApiError(404, 'Order item not found');
  item.sellerStatus = req.body.sellerStatus;
  if (item.sellerStatus === 'delivered') {
    const store = await SellerProfile.findById(sellerId);
    store.stats.totalSales = round2(store.stats.totalSales + item.sellerEarning);
    store.stats.totalOrders += 1;
    await store.save();
  }
  order.timeline.push({ label: `Item ${item.sellerStatus}`, at: new Date() });
  await order.save();
  const view = orderView(order);
  view.items = view.items.filter((entry) => String(entry.sellerId) === String(sellerId));
  ok(res, view, 'Fulfillment updated');
});

function series(orders, days, key) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(); date.setDate(date.getDate() - i);
    buckets.set(date.toISOString().slice(0, 10), 0);
  }
  orders.forEach((order) => {
    if (order.paymentStatus !== 'paid') return;
    const day = new Date(order.createdAt).toISOString().slice(0, 10);
    buckets.set(day, round2((buckets.get(day) || 0) + order.items.reduce((sum, item) => sum + (key === 'commission' ? item.commission : item.sellerEarning), 0)));
  });
  return [...buckets].map(([date, value]) => ({ date, value }));
}

async function sellerOrders(sellerId, days) {
  const since = new Date(); since.setDate(since.getDate() - days);
  return Order.find({ items: { $elemMatch: { sellerId } }, createdAt: { $gte: since } }).lean();
}

export const earnings = asyncHandler(async (req, res) => {
  const sellerId = await sellerFilter(req);
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const orders = await sellerOrders(sellerId, days);
  const sellerEarning = round2(orders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.sellerEarningTotal, 0));
  const commission = round2(orders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.commissionTotal, 0));
  ok(res, { sellerEarning, commission, orders: orders.length, chart: series(orders, days, 'earning') });
});

export const commissions = asyncHandler(async (req, res) => {
  const sellerId = await sellerFilter(req);
  const orders = await Order.find({ items: { $elemMatch: { sellerId } } }).sort({ createdAt: -1 }).limit(100).lean();
  const rows = orders.flatMap((order) => order.items
    .filter((item) => String(item.sellerId) === String(sellerId))
    .map((item) => ({ orderNumber: order.orderNumber, date: order.createdAt, title: item.title, subtotal: item.subtotal, commission: item.commission, sellerEarning: item.sellerEarning, paymentStatus: order.paymentStatus })));
  ok(res, rows);
});
