import { Order } from '../models/order.js';
import { Product } from '../models/product.js';
import { Cart } from '../models/cart.js';
import { Address } from '../models/address.js';
import { Payment } from '../models/payment.js';
import { SellerProfile } from '../models/seller-profile.js';
import { ApiError, asyncHandler, ok, pagination, round2 } from '../utils/api.js';
import { orderNumber, escapeText } from '../utils/common.js';
import { commissionFor, getSettings, notify } from '../services/marketplace.js';
import { runInTransaction } from '../config/db.js';
import { orderView } from '../utils/serialize.js';
import { isObjectId } from '../services/marketplace.js';

export const createOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod, note } = req.body;
  if (!isObjectId(addressId)) throw new ApiError(400, 'Invalid address');
  const settings = await getSettings();
  const address = await Address.findOne({ _id: addressId, userId: req.user.id }).lean();
  if (!address) throw new ApiError(404, 'Address not found');

  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart?.items.length) throw new ApiError(400, 'Your cart is empty');

  const result = await runInTransaction(async (session) => {
    const items = [];
    const freshCart = await Cart.findOne({ userId: req.user.id }).session(session || null);
    if (!freshCart?.items.length) throw new ApiError(400, 'Your cart is empty');

    for (const entry of freshCart.items) {
      const product = await Product.findOne({ _id: entry.productId, status: 'active', approved: true }).session(session || null);
      if (!product) throw new ApiError(409, 'An item in your cart is no longer available');
      const variant = entry.variantKey ? product.variants.find((v) => v.key === entry.variantKey) : null;
      if (entry.variantKey && !variant) throw new ApiError(409, `Variant unavailable for ${product.title}`);
      const unitPrice = variant ? variant.price : product.price;
      const stock = variant ? variant.stock : product.stock;
      if (entry.quantity > stock) throw new ApiError(409, `Only ${stock} left for ${product.title}`);

      const image = product.images?.[0]?.url || '';
      const commission = commissionFor(unitPrice * entry.quantity, settings.commissionPercent);
      items.push({
        productId: product._id, sellerId: product.sellerId, title: product.title, image,
        variantKey: entry.variantKey || '', variantName: variant?.name || '',
        unitPrice, quantity: entry.quantity, subtotal: round2(unitPrice * entry.quantity),
        commission, sellerEarning: round2(unitPrice * entry.quantity - commission),
      });
    }

    const subtotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
    const shipping = subtotal >= settings.freeShippingOver ? 0 : settings.shippingFee;
    const total = round2(subtotal + shipping);
    const order = await Order.create([{
      orderNumber: orderNumber(), buyerId: req.user.id, items,
      address: { name: address.name, phone: address.phone, line1: address.line1, line2: address.line2, city: address.city, district: address.district, postalCode: address.postalCode, country: address.country },
      note: escapeText(note || ''), subtotal, shipping, total, paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      status: 'pending',
      commissionTotal: round2(items.reduce((sum, item) => sum + item.commission, 0)),
      sellerEarningTotal: round2(items.reduce((sum, item) => sum + item.sellerEarning, 0)),
      platformRevenue: 0,
      timeline: [{ label: 'Order placed', at: new Date() }],
    }], { session });

    for (const item of items) {
      const filter = { _id: item.productId };
      const update = { $inc: { sold: item.quantity } };
      if (item.variantKey) {
        filter['variants.key'] = item.variantKey;
        filter['variants.stock'] = { $gte: item.quantity };
        update.$inc['variants.$.stock'] = -item.quantity;
      } else {
        filter.stock = { $gte: item.quantity };
        update.$inc.stock = -item.quantity;
      }
      const updated = await Product.updateOne(filter, update, { session });
      if (!updated.modifiedCount) throw new ApiError(409, `Not enough stock for ${item.title}`);
    }

    await Payment.create([{ orderId: order[0]._id, buyerId: req.user.id, gateway: paymentMethod === 'cod' ? 'cod' : 'sslcommerz', amount: total, status: 'pending' }], { session });
    await Cart.deleteOne({ userId: req.user.id }, { session });

    const sellerIds = [...new Set(items.map((item) => String(item.sellerId)))];
    const sellers = await SellerProfile.find({ _id: { $in: sellerIds } }).select('userId').session(session || null);
    await Promise.all(sellers.map((store) => notify(store.userId, 'New order received', order[0].orderNumber, 'order', '/dashboard/seller/orders')));

    return order[0];
  });

  ok(res, orderView(result), 'Order placed successfully', 201);
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { buyerId: req.user.id };
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  ok(res, items.map(orderView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

async function findOrderForUser(req) {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  const isBuyer = order.buyerId === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const store = req.user.role === 'seller' ? await SellerProfile.findOne({ userId: req.user.id }).lean() : null;
  const isSeller = Boolean(store && order.items.some((item) => String(item.sellerId) === String(store._id)));
  if (!isBuyer && !isAdmin && !isSeller) throw new ApiError(403, 'You cannot view this order');
  return { order, isSellerStoreId: store?._id };
}

export const getOrder = asyncHandler(async (req, res) => {
  const { order, isSellerStoreId } = await findOrderForUser(req);
  const view = orderView(order);
  if (isSellerStoreId) view.items = view.items.filter((item) => String(item.sellerId) === String(isSellerStoreId));
  const payment = await Payment.findOne({ orderId: order._id }).select('-gatewayResponse').lean();
  ok(res, { order: view, payment });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyerId: req.user.id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (!['pending', 'processing'].includes(order.status)) throw new ApiError(409, 'This order can no longer be cancelled');
  if (order.paymentStatus === 'paid') throw new ApiError(409, 'Paid orders require an admin refund. Please contact support.');

  await runInTransaction(async (session) => {
    for (const item of order.items) {
      const filter = { _id: item.productId };
      const update = { $inc: { sold: -item.quantity } };
      if (item.variantKey) {
        filter['variants.key'] = item.variantKey;
        update.$inc['variants.$.stock'] = item.quantity;
      } else update.$inc.stock = item.quantity;
      await Product.updateOne(filter, update, { session });
    }
    order.status = 'cancelled';
    order.items.forEach((item) => { item.sellerStatus = 'cancelled'; });
    order.timeline.push({ label: 'Cancelled by buyer', at: new Date() });
    await order.save({ session });
    await Payment.updateOne({ orderId: order._id, status: 'pending' }, { $set: { status: 'cancelled' } }, { session });
  });
  ok(res, orderView(order), 'Order cancelled');
});
