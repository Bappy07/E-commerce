import { Payment } from '../models/payment.js';
import { Order } from '../models/order.js';
import { SellerProfile } from '../models/seller-profile.js';
import { runInTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { ApiError, round2 } from '../utils/api.js';
import { notify } from './marketplace.js';
import {
  CHECKOUT_TTL_MS, MOCK_METHODS, MOCK_OUTCOMES, OUTCOME_STATUS,
  amountMatches, gatewayLabel, gatewayMode, newCheckoutToken, newTransactionId,
} from '../utils/payments.js';

const payableStatuses = ['pending', 'failed', 'cancelled'];
const orderLink = (orderId) => `/dashboard/buyer/orders/${orderId}`;

async function emitNotifications(items) {
  await Promise.allSettled(items.map((args) => notify(...args)));
}

// public description of available methods — credentials are never returned.
export function paymentMethods() {
  const sslReady = Boolean(env.ssl.storeId && env.ssl.storePassword);
  return [
    {
      id: 'cod', label: 'Cash on delivery',
      description: 'Pay cash when your order arrives',
      simulated: false, offline: true, available: true,
    },
    {
      id: 'mock', label: 'Simulated online payment',
      description: 'Demo card / mobile banking checkout. No real money is charged.',
      simulated: true, offline: false, available: true,
      methods: MOCK_METHODS,
    },
    {
      id: 'sslcommerz', label: 'SSLCommerz',
      description: sslReady
        ? (env.ssl.sandbox ? 'Sandbox gateway — no real money is charged.' : 'Live gateway.')
        : 'Not configured. Choose a simulated payment method instead.',
      simulated: !sslReady || env.ssl.sandbox,
      offline: false,
      available: sslReady,
    },
  ];
}

export function buildPaymentDoc(order, gateway, method = '') {
  return {
    orderId: order._id,
    buyerId: order.buyerId,
    gateway,
    mode: gateway === 'sslcommerz' && !env.ssl.sandbox ? 'live' : gatewayMode(gateway),
    method,
    amount: round2(order.total),
    currency: 'BDT',
    transactionId: newTransactionId(gateway),
    status: 'pending',
    timeline: [{ label: `${gatewayLabel(gateway)} payment created`, meta: { amount: round2(order.total) } }],
  };
}

export async function payableOrder(orderId, buyerId) {
  if (!orderId) throw new ApiError(400, 'Order id is required');
  const filter = { _id: orderId };
  if (buyerId) filter.buyerId = buyerId;
  const order = await Order.findOne(filter);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentStatus === 'paid') throw new ApiError(409, 'This order is already paid');
  if (order.paymentStatus === 'refunded') throw new ApiError(409, 'This order has been refunded');
  if (!payableStatuses.includes(order.paymentStatus)) throw new ApiError(409, `Payment is ${order.paymentStatus}`);
  if (['cancelled', 'refunded'].includes(order.status)) throw new ApiError(409, 'This order is no longer payable');
  return order;
}

// Reuse an unprocessed checkout session so double-clicks never create a second transaction.
export async function initMockPayment({ orderId, buyerId, method = 'card' }) {
  if (!MOCK_METHODS.includes(method)) throw new ApiError(400, 'Unsupported simulated payment method');
  const order = await payableOrder(orderId, buyerId);
  if (order.paymentMethod !== 'mock') throw new ApiError(400, 'This order does not use simulated online payment');

  const existing = await Payment.findOne({ orderId: order._id, gateway: 'mock', status: 'pending' });
  let payment = existing;
  const now = new Date();

  if (payment?.checkoutToken && payment.tokenExpiresAt && payment.tokenExpiresAt > now) {
    // Idempotent init: same transaction id and token, no new record.
    return mockCheckoutResponse(payment, order);
  }

  if (!payment) {
    payment = await Payment.create(buildPaymentDoc(order, 'mock', method));
  } else {
    payment.method = method;
    payment.timeline.push({ label: 'Checkout session reopened' });
  }
  payment.checkoutToken = newCheckoutToken();
  payment.tokenExpiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
  payment.idempotencyKey = newCheckoutToken();
  payment.failureReason = '';
  await payment.save();
  return mockCheckoutResponse(payment, order);
}

function mockCheckoutResponse(payment, order) {
  return {
    checkoutToken: payment.checkoutToken,
    checkoutUrl: `/payment/checkout?token=${payment.checkoutToken}`,
    transactionId: payment.transactionId,
    amount: round2(payment.amount),
    currency: payment.currency,
    orderNumber: order.orderNumber,
    expiresAt: payment.tokenExpiresAt,
    simulated: true,
  };
}

// Authoritative details for the simulated checkout screen — nothing comes from the URL.
export async function mockSession(token) {
  const payment = await Payment.findOne({ checkoutToken: token, gateway: 'mock' });
  if (!payment) throw new ApiError(404, 'Checkout session not found');
  const order = await Order.findById(payment.orderId).select('orderNumber total');
  if (!order) throw new ApiError(404, 'Order not found');
  return {
    token: payment.checkoutToken,
    transactionId: payment.transactionId,
    status: payment.status,
    processed: Boolean(payment.processedAt),
    amount: round2(payment.amount),
    currency: payment.currency,
    method: payment.method,
    orderNumber: order.orderNumber,
    expiresAt: payment.tokenExpiresAt,
    simulated: true,
  };
}

// The token is server-issued and the amount is re-read from the database here.
// "outcome" selects a simulated scenario; the backend alone decides the resulting status.
export async function verifyMockPayment({ token, outcome }) {
  if (!MOCK_OUTCOMES.includes(outcome)) throw new ApiError(400, 'Invalid simulated checkout outcome');
  const payment = await Payment.findOne({ checkoutToken: token, gateway: 'mock' });
  if (!payment) throw new ApiError(404, 'Checkout session not found');
  if (payment.processedAt) return { duplicate: true, payment, order: await Order.findById(payment.orderId).lean() };

  const order = await Order.findById(payment.orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!amountMatches(order, payment)) {
    throw new ApiError(409, 'Order total no longer matches the payment. Verification aborted.');
  }
  if (order.paymentStatus === 'paid') throw new ApiError(409, 'This order is already paid');

  if (!payment.tokenExpiresAt || payment.tokenExpiresAt.getTime() < Date.now()) {
    const expired = await settlePayment({
      payment, status: 'cancelled',
      details: { note: 'Simulated checkout session expired', outcome: 'expired' },
    });
    return { ...expired, expired: true };
  }

  const status = OUTCOME_STATUS[outcome];
  return settlePayment({
    payment, status,
    details: {
      note: `Simulated gateway scenario: ${outcome}`,
      outcome,
      method: payment.method,
      scenario: 'mock-provider',
    },
  });
}

async function settleInSession({ payment, status, details = {}, session, order: suppliedOrder }) {
  const locked = await Payment.findOneAndUpdate(
    { _id: payment._id, processedAt: { $exists: false } },
    {
      $set: {
        status,
        processedAt: new Date(),
        failureReason: status === 'paid' ? '' : (details.note || ''),
        ...(details.valId ? { valId: details.valId } : {}),
        ...(details.gatewayResponse ? { gatewayResponse: details.gatewayResponse } : {}),
        ...(details.method ? { method: details.method } : {}),
      },
      $push: {
        timeline: { label: `Payment ${status}`, at: new Date(), meta: { scenario: details.scenario || details.outcome || 'gateway' } },
      },
    },
    { new: true, session },
  );
  if (!locked) return { duplicate: true, payment, order: suppliedOrder || null, notifications: [] };

  const order = suppliedOrder || await Order.findById(locked.orderId).session(session || null);
  if (!order) throw new ApiError(404, 'Order not found for payment');
  if (!amountMatches(order, locked)) throw new ApiError(409, 'Order total no longer matches the payment. Verification aborted.');

  const notifications = [];
  if (status === 'paid') {
    if (order.paymentStatus === 'paid') throw new ApiError(409, 'This order is already paid');
    order.paymentStatus = 'paid';
    if (order.status === 'pending') order.status = 'processing';
    order.platformRevenue = round2(order.commissionTotal);
    order.timeline.push({ label: `Payment confirmed (${gatewayLabel(locked.gateway)})`, at: new Date() });
    await creditSellerEarnings(order, session);
    notifications.push([order.buyerId, 'Payment confirmed', order.orderNumber, 'payment', orderLink(order._id)]);
    const stores = await SellerProfile.find({ _id: { $in: order.items.map((i) => i.sellerId) } }).select('userId').session(session || null);
    stores.forEach((store) => notifications.push([store.userId, 'Paid order ready', order.orderNumber, 'order', '/dashboard/seller/orders']));
  } else {
    order.paymentStatus = status;
    order.timeline.push({ label: `Payment ${status}`, at: new Date() });
    notifications.push([order.buyerId, `Payment ${status}`, order.orderNumber, 'payment', orderLink(order._id)]);
  }
  await order.save({ session });
  return { duplicate: false, payment: locked, order, notifications };
}

export async function settlePayment({ payment, status, details = {}, session }) {
  if (payment.processedAt) return { duplicate: true, payment };
  if (session) {
    const result = await settleInSession({ payment, status, details, session });
    await emitNotifications(result.notifications);
    return result;
  }
  const result = await runInTransaction((txSession) => settleInSession({ payment, status, details, session: txSession }));
  await emitNotifications(result.notifications);
  return result;
}

async function creditSellerEarnings(order, session) {
  const totals = new Map();
  order.items.forEach((item) => {
    const key = String(item.sellerId);
    totals.set(key, round2((totals.get(key) || 0) + Number(item.sellerEarning || 0)));
  });
  for (const [sellerId, amount] of totals) {
    if (amount <= 0) continue;
    await SellerProfile.updateOne(
      { _id: sellerId },
      { $inc: { 'finance.earnings': amount, 'finance.available': amount } },
      { session: session || null },
    );
  }
}

async function reverseSellerEarnings(order, session) {
  const totals = new Map();
  order.items.forEach((item) => {
    const key = String(item.sellerId);
    totals.set(key, round2((totals.get(key) || 0) + Number(item.sellerEarning || 0)));
  });
  for (const [sellerId, amount] of totals) {
    if (amount <= 0) continue;
    const store = await SellerProfile.findById(sellerId).session(session || null);
    if (!store) continue;
    const available = round2(Math.max(0, Number(store.finance?.available || 0) - amount));
    await SellerProfile.updateOne(
      { _id: sellerId },
      {
        $set: { 'finance.available': available },
        $inc: { 'finance.earnings': -amount, 'finance.refunds': amount },
      },
      { session: session || null },
    );
  }
}

// Refunds are simulations: no money moves, but the ledger is reversed.
export async function refundPaymentRecord(payment, { note = '', adminId = '' } = {}) {
  if (payment.status !== 'paid') throw new ApiError(409, 'Only paid payments can be refunded');
  const result = await runInTransaction(async (session) => {
    const locked = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'paid' },
      {
        $set: {
          status: 'refunded',
          refund: { status: 'completed', amount: round2(payment.amount), note, at: new Date(), by: adminId },
        },
        $push: { timeline: { label: 'Refund simulated by admin', at: new Date(), meta: { by: adminId } } },
      },
      { new: true, session },
    );
    if (!locked) throw new ApiError(409, 'Payment was already refunded');

    const order = await Order.findById(locked.orderId).session(session);
    if (!order) throw new ApiError(404, 'Order not found for payment');
    order.paymentStatus = 'refunded';
    order.status = 'refunded';
    order.platformRevenue = 0;
    order.timeline.push({ label: 'Refund simulated by admin', at: new Date() });
    await order.save({ session });
    await reverseSellerEarnings(order, session);
    return { payment: locked, order };
  });
  await emitNotifications([[result.order.buyerId, 'Refund simulated', result.order.orderNumber, 'payment', orderLink(result.order._id)]]);
  return result;
}

// A seller confirms cash collection for their own line items. The order settles
// automatically once every seller has confirmed their share.
export async function collectCodItem(orderId, itemId, sellerId, { collectedBy = '', note = '' } = {}) {
  const result = await runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentMethod !== 'cod') throw new ApiError(400, 'This order is not payable on delivery');
    const item = order.items.id(itemId);
    if (!item || String(item.sellerId) !== String(sellerId)) throw new ApiError(404, 'Order item not found');

    if (!item.codCollected) {
      item.codCollected = true;
      item.codCollectedAt = new Date();
      order.timeline.push({ label: `COD collected by store ${sellerId}`, at: new Date() });
    }

    let settlement = null;
    if (order.items.every((entry) => entry.codCollected) && order.paymentStatus !== 'paid') {
      const payment = await Payment.findOne({ orderId: order._id, gateway: 'cod', status: 'pending' }).session(session);
      if (payment) {
        settlement = await settleInSession({
          payment, order, status: 'paid', session,
          details: { note: note || 'Cash collected on delivery', method: 'cash', scenario: 'cod-item-collection', collectedBy },
        });
      }
    }
    if (!settlement) await order.save({ session });
    return { order, settlement };
  });
  if (result.settlement) await emitNotifications(result.settlement.notifications || []);
  return result.order;
}

// COD becomes "paid" only when cash collection is confirmed by an authorized user.
export async function settleCodPayment(orderId, { collectedBy = '', note = '' } = {}) {
  const result = await runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentMethod !== 'cod') throw new ApiError(400, 'This order is not payable on delivery');
    if (order.paymentStatus === 'paid') throw new ApiError(409, 'Cash has already been collected for this order');

    const payment = await Payment.findOne({ orderId: order._id, gateway: 'cod', status: 'pending' }).session(session);
    if (!payment) throw new ApiError(409, 'No pending COD payment found');

    order.delivery.paymentCollected = true;
    order.delivery.collectedAt = new Date();
    order.delivery.collectedBy = collectedBy;
    if (note) order.delivery.note = note;
    order.items.forEach((item) => {
      item.codCollected = true;
      item.codCollectedAt = new Date();
    });
    order.timeline.push({ label: 'Cash collected on delivery', at: new Date() });
    await order.save({ session });

    return settleInSession({
      payment, order, status: 'paid', session,
      details: { note: note || 'Cash collected on delivery', method: 'cash', scenario: 'cod-collection' },
    });
  });
  await emitNotifications(result.notifications || []);
  return result;
}

export async function paymentForOrder(orderId, userId, role) {
  const payment = await Payment.findOne({ orderId }).select('-gatewayResponse').lean();
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (String(payment.buyerId) !== String(userId) && role !== 'admin') throw new ApiError(403, 'Not allowed');
  return payment;
}
