import axios from 'axios';
import { Payment } from '../models/payment.js';
import { Order } from '../models/order.js';
import { User } from '../models/user.js';
import { SellerProfile } from '../models/seller-profile.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler, ok } from '../utils/api.js';
import { notify } from '../services/marketplace.js';

const GATEWAY = () => (env.ssl.sandbox ? 'https://sandboxsslcommerz.com' : 'https://sslcommerz.com');
const FRONTEND = () => env.clientUrl;

function requireSslCredentials() {
  if (!env.ssl.storeId || !env.ssl.storePassword) {
    throw new ApiError(503, 'SSLCommerz credentials are not configured. Add sandbox credentials to server/.env.');
  }
}

async function findOrder(req) {
  const order = await Order.findOne({ _id: req.params.orderId || req.body.orderId, buyerId: req.user.id });
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
}

export const initSslPayment = asyncHandler(async (req, res) => {
  requireSslCredentials();
  const order = await findOrder(req);
  if (order.paymentMethod !== 'sslcommerz') throw new ApiError(400, 'This order does not use online payment');
  if (order.paymentStatus === 'paid') throw new ApiError(409, 'This order is already paid');

  let payment = await Payment.findOne({ orderId: order._id, gateway: 'sslcommerz' });
  if (!payment) payment = await Payment.create({ orderId: order._id, buyerId: req.user.id, gateway: 'sslcommerz', amount: order.total });
  const tranId = payment.transactionId || `MKT${payment._id.toString().toUpperCase()}`;
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
    item_category: 'Marketplace', item_price: String(order.subtotal), item_qty: String(order.items.reduce((sum, i) => sum + i.quantity, 0)),
  });

  const { data } = await axios.post(`${GATEWAY()}/gwprocess/v4/api.php`, params, { timeout: 20000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
    throw new ApiError(502, data.failedreason || 'Payment gateway rejected the request');
  }
  payment.transactionId = tranId;
  payment.method = data.method || '';
  payment.gatewayResponse = { status: data.status };
  await payment.save();
  ok(res, { gatewayUrl: data.GatewayPageURL, transactionId: tranId });
});

async function verifyGateway(query) {
  const { val_id, tran_id, amount } = query;
  if (!val_id || !tran_id) throw new ApiError(400, 'Invalid payment callback');
  const params = new URLSearchParams({
    val_id, store_id: env.ssl.storeId, store_passwd: env.ssl.storePassword, format: 'json',
  });
  const { data } = await axios.get(`${GATEWAY()}/validator/api/validationserverAPI.php`, { params, timeout: 20000 });
  const valid = ['VALID', 'VALIDATED'].includes(data.result)
    && data.tran_id === tran_id
    && Number(data.amount) > 0
    && (!amount || Math.abs(Number(data.amount) - Number(amount)) < 1);
  return { valid, data, tranId: tran_id };
}

async function settlePayment(tranId, status, data = {}) {
  const payment = await Payment.findOneAndUpdate(
    { transactionId: tranId, processedAt: { $exists: false } },
    { $set: { status, processedAt: new Date(), valId: data.val_id || '', gatewayResponse: { result: data.result, bank_tran_id: data.bank_tran_id, card_type: data.card_type } } },
    { new: true },
  );
  if (!payment) return { duplicate: true, payment };
  const order = await Order.findById(payment.orderId);
  if (status === 'paid') {
    order.paymentStatus = 'paid';
    order.status = 'processing';
    order.platformRevenue = order.commissionTotal;
    order.timeline.push({ label: 'Payment verified', at: new Date() });
  } else {
    order.paymentStatus = 'failed';
    order.timeline.push({ label: 'Payment failed or cancelled', at: new Date() });
  }
  await order.save();
  await notify(order.buyerId, status === 'paid' ? 'Payment confirmed' : 'Payment not completed', order.orderNumber, 'payment', `/dashboard/buyer/orders/${order._id}`);
  const stores = await SellerProfile.find({ _id: { $in: order.items.map((i) => i.sellerId) } }).select('userId');
  if (status === 'paid') await Promise.all(stores.map((store) => notify(store.userId, 'Paid order ready', order.orderNumber, 'order', '/dashboard/seller/orders')));
  return { duplicate: false, payment, order };
}

export const sslSuccess = asyncHandler(async (req, res) => {
  requireSslCredentials();
  const result = await verifyGateway(req.query);
  const settled = await settlePayment(result.tranId, result.valid ? 'paid' : 'failed', result.data);
  res.redirect(`${FRONTEND()}/payment/result?status=${result.valid ? 'success' : 'failed'}&order=${settled.order?._id || ''}`);
});

export const sslFail = asyncHandler(async (req, res) => {
  const tranId = req.query.tran_id || req.query.tranId;
  if (tranId) await settlePayment(tranId, 'failed', req.query);
  res.redirect(`${FRONTEND()}/payment/result?status=failed&order=${req.query.orderId || ''}`);
});

export const sslCancel = asyncHandler(async (req, res) => {
  const tranId = req.query.tran_id || req.query.tranId;
  if (tranId) await settlePayment(tranId, 'cancelled', req.query);
  res.redirect(`${FRONTEND()}/payment/result?status=cancelled&order=${req.query.orderId || ''}`);
});

export const sslIpn = asyncHandler(async (req, res) => {
  if (!env.ssl.storeId) return res.status(200).send('OK');
  try {
    const result = await verifyGateway(req.body);
    await settlePayment(result.tranId, result.valid ? 'paid' : 'failed', result.data);
  } catch (error) {
    console.error('SSLCommerz IPN error:', error.message);
  }
  res.status(200).send('OK');
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ orderId: req.params.orderId }).select('-gatewayResponse').lean();
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.buyerId !== req.user.id && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');
  ok(res, payment);
});
