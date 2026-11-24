import axios from 'axios';
import { env } from '../config/env.js';
import { Payment } from '../models/payment.js';
import { Order } from '../models/order.js';
import { User } from '../models/user.js';
import { ApiError, asyncHandler, ok, pagination } from '../utils/api.js';
import { paymentView } from '../utils/serialize.js';
import {
  buildPaymentDoc, initMockPayment, mockSession, paymentForOrder, paymentMethods,
  settlePayment, verifyMockPayment,
} from '../services/payments.js';

const GATEWAY = () => (env.ssl.sandbox ? 'https://sandboxsslcommerz.com' : 'https://sslcommerz.com');

function requireSslCredentials() {
  if (!env.ssl.storeId || !env.ssl.storePassword) {
    throw new ApiError(503, 'SSLCommerz is not configured. Use a simulated payment method — no merchant account is required.');
  }
}

export const getMethods = asyncHandler(async (_req, res) => ok(res, paymentMethods()));

export const initMock = asyncHandler(async (req, res) => {
  const result = await initMockPayment({
    orderId: req.body.orderId,
    buyerId: req.user.id,
    method: req.body.method || 'card',
  });
  ok(res, result, 'Simulated checkout session ready');
});

export const getMockSession = asyncHandler(async (req, res) => {
  ok(res, await mockSession(req.query.token));
});

const resultStatus = { paid: 'success', failed: 'failed', cancelled: 'cancelled', refunded: 'failed' };

export const verifyMock = asyncHandler(async (req, res) => {
  const result = await verifyMockPayment({ token: req.body.token, outcome: req.body.outcome });
  const orderId = String(result.payment.orderId?._id || result.payment.orderId || '');
  const status = resultStatus[result.payment.status] || 'failed';
  ok(res, {
    status: result.payment.status,
    simulated: true,
    duplicate: Boolean(result.duplicate),
    expired: Boolean(result.expired),
    transactionId: result.payment.transactionId,
    amount: result.payment.amount,
    orderId,
    orderNumber: result.order?.orderNumber || '',
    redirectUrl: `/payment/result?status=${status}&order=${orderId}&transaction=${result.payment.transactionId}&simulated=1`,
  }, result.duplicate ? 'This checkout session was already processed' : 'Simulated payment processed');
});

export const history = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { buyerId: req.user.id };
  if (['pending', 'paid', 'failed', 'cancelled', 'refunded'].includes(req.query.status)) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  ok(res, items.map(paymentView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const getPayment = asyncHandler(async (req, res) => {
  ok(res, paymentView(await paymentForOrder(req.params.orderId, req.user.id, req.user.role)));
});

/* ------------------------- Optional SSLCommerz adapter ------------------------- */

export const initSslPayment = asyncHandler(async (req, res) => {
  requireSslCredentials();
  const order = await Order.findOne({ _id: req.body.orderId, buyerId: req.user.id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentMethod !== 'sslcommerz') throw new ApiError(400, 'This order does not use SSLCommerz');
  if (order.paymentStatus === 'paid') throw new ApiError(409, 'This order is already paid');

  let payment = await Payment.findOne({ orderId: order._id, gateway: 'sslcommerz', status: 'pending' });
  if (!payment) payment = await Payment.create(buildPaymentDoc(order, 'sslcommerz'));
  const tranId = payment.transactionId;

  const user = await User.findById(req.user.id).select('email').lean();
  const params = new URLSearchParams({
    store_id: env.ssl.storeId, store_passwd: env.ssl.storePassword,
    total_amount: String(order.total), currency: 'BDT', tran_id: tranId,
    success_url: `${env.authUrl}/api/payments/sslcommerz/success?orderId=${order._id}`,
    fail_url: `${env.authUrl}/api/payments/sslcommerz/fail?orderId=${order._id}`,
    cancel_url: `${env.authUrl}/api/payments/sslcommerz/cancel?orderId=${order._id}`,
    ipn_url: `${env.authUrl}/api/payments/sslcommerz/ipn`,
    emi_option: '0', cus_name: order.address.name, cus_email: user?.email || 'buyer@marketly.test',
    cus_phone: order.address.phone, cus_add1: order.address.line1, cus_city: order.address.city,
    cus_country: order.address.country || 'Bangladesh', shipping_method: 'NO',
    num_item: String(order.items.length), item_name: order.items.map((i) => i.title).join(', ').slice(0, 100),
    item_category: 'Marketplace', item_price: String(order.subtotal),
    item_qty: String(order.items.reduce((sum, i) => sum + i.quantity, 0)),
  });

  const { data } = await axios.post(`${GATEWAY()}/gwprocess/v4/api.php`, params, {
    timeout: 20000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
    throw new ApiError(502, data.failedreason || 'Payment gateway rejected the request');
  }
  payment.method = data.method || '';
  payment.gatewayResponse = { status: data.status };
  await payment.save();
  ok(res, { gatewayUrl: data.GatewayPageURL, transactionId: tranId, simulated: env.ssl.sandbox });
});

async function verifyGateway(query) {
  const { val_id, tran_id, amount } = query;
  if (!val_id || !tran_id) throw new ApiError(400, 'Invalid payment callback');
  const { data } = await axios.get(`${GATEWAY()}/validator/api/validationserverAPI.php`, {
    params: { val_id, store_id: env.ssl.storeId, store_passwd: env.ssl.storePassword, format: 'json' },
    timeout: 20000,
  });
  const valid = ['VALID', 'VALIDATED'].includes(data.result)
    && data.tran_id === tran_id
    && Number(data.amount) > 0
    && (!amount || Math.abs(Number(data.amount) - Number(amount)) < 1);
  return { valid, data, tranId: tran_id };
}

async function settleByTransaction(tranId, status, details = {}) {
  if (!tranId) return { duplicate: true };
  const payment = await Payment.findOne({ transactionId: tranId });
  if (!payment) return { duplicate: true };
  return settlePayment({
    payment, status,
    details: { ...details, scenario: 'sslcommerz-callback' },
  });
}

function redirect(res, status, orderId, transactionId) {
  const query = new URLSearchParams({ status });
  if (orderId) query.set('order', String(orderId));
  if (transactionId) query.set('transaction', String(transactionId));
  if (env.ssl.sandbox) query.set('simulated', '1');
  res.redirect(`${env.clientUrl}/payment/result?${query}`);
}

export const sslSuccess = asyncHandler(async (req, res) => {
  requireSslCredentials();
  const result = await verifyGateway(req.query);
  const settled = await settleByTransaction(result.tranId, result.valid ? 'paid' : 'failed', {
    valId: result.data.val_id,
    gatewayResponse: { result: result.data.result, bank_tran_id: result.data.bank_tran_id, card_type: result.data.card_type },
  });
  redirect(res, result.valid ? 'success' : 'failed', settled.order?._id || req.query.orderId, result.tranId);
});

export const sslFail = asyncHandler(async (req, res) => {
  const tranId = req.query.tran_id || req.query.tranId;
  await settleByTransaction(tranId, 'failed', { note: 'SSLCommerz failure callback' });
  redirect(res, 'failed', req.query.orderId, tranId);
});

export const sslCancel = asyncHandler(async (req, res) => {
  const tranId = req.query.tran_id || req.query.tranId;
  await settleByTransaction(tranId, 'cancelled', { note: 'SSLCommerz cancellation callback' });
  redirect(res, 'cancelled', req.query.orderId, tranId);
});

export const sslIpn = asyncHandler(async (req, res) => {
  if (!env.ssl.storeId) return res.status(200).send('OK');
  try {
    const result = await verifyGateway(req.body);
    await settleByTransaction(result.tranId, result.valid ? 'paid' : 'failed', {
      valId: result.data.val_id,
      gatewayResponse: { result: result.data.result, bank_tran_id: result.data.bank_tran_id },
    });
  } catch (error) {
    console.error('SSLCommerz IPN error:', error.message);
  }
  res.status(200).send('OK');
});
