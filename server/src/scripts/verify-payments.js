import axios from 'axios';

/**
 * Live verification of Portfolio Mode payments.
 * Requires the API to be running and seeded (npm run seed).
 * Usage: npm run verify:payments
 */
const base = process.env.API_URL || 'http://localhost:5000/api';
const cookies = new Map();
const client = axios.create({ baseURL: base, timeout: 30000 });

client.interceptors.response.use((response) => {
  const setCookie = response.headers['set-cookie'];
  if (setCookie) setCookie.forEach((cookie) => cookies.set(cookie.split('=')[0], cookie.split(';')[0]));
  return response;
});

const withCookies = (config = {}) => ({
  ...config,
  headers: { ...(config.headers || {}), Cookie: [...cookies.values()].join('; ') },
});

const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`PASS: ${label}`);
};

const denied = (request) => request().then(() => null).catch((error) => error.response);

async function signIn(email, password) {
  cookies.clear();
  await client.post('/auth/sign-in/email', { email, password });
  return (await client.get('/users/me', withCookies())).data.data.user;
}

async function getAddress() {
  const existing = (await client.get('/users/addresses', withCookies())).data.data;
  if (existing.length) return existing[0]._id;
  const created = (await client.post('/users/addresses', {
    label: 'Home', name: 'Payment Test', phone: '01711112222',
    line1: '12 Green Road', city: 'Dhaka', district: 'Dhaka', country: 'Bangladesh',
  }, withCookies())).data.data;
  return created._id;
}

async function checkout(paymentMethod, addressId, storeSlug = '') {
  await client.delete('/cart', withCookies());
  const query = storeSlug ? `/catalog/products?limit=1&storeSlug=${encodeURIComponent(storeSlug)}` : '/catalog/products?limit=1';
  const product = (await client.get(query, withCookies())).data.data[0];
  await client.post('/cart', { productId: product.id, quantity: 1 }, withCookies());
  const order = (await client.post('/orders', { addressId, paymentMethod }, withCookies())).data.data;
  return order;
}

async function run() {
  console.log('--- Portfolio Mode payment verification ---');

  const buyer = await signIn('buyer@marketly.test', 'Buyer@12345');
  const addressId = await getAddress();

  // Use products from the known seller store so finance assertions target that ledger.
  await signIn('seller@marketly.test', 'Seller@12345');
  const storeProfile = (await client.get('/sellers/me', withCookies())).data.data;
  await signIn('buyer@marketly.test', 'Buyer@12345');

  const methods = (await client.get('/payments/methods', withCookies())).data.data;
  check('method discovery advertises mock and COD', methods.some((m) => m.id === 'mock') && methods.some((m) => m.id === 'cod'));
  check('mock is clearly marked simulated', methods.find((m) => m.id === 'mock')?.simulated === true);
  check('SSLCommerz is optional', methods.find((m) => m.id === 'sslcommerz')?.available === false);

  // 1. Simulated success with idempotency
  const successOrder = await checkout('mock', addressId, storeProfile.slug);
  const session = (await client.post('/payments/mock/init', { orderId: successOrder.id, method: 'card' }, withCookies())).data.data;
  check('checkout token and transaction id issued', Boolean(session.checkoutToken) && session.transactionId.startsWith('SIM-'));
  check('checkout response is labelled simulated', session.simulated === true);

  const sessionView = (await client.get('/payments/mock/session', { ...withCookies(), params: { token: session.checkoutToken } })).data.data;
  check('checkout screen reads authoritative amount', sessionView.amount === successOrder.total);

  const verified = (await client.post('/payments/mock/verify', { token: session.checkoutToken, outcome: 'success' }, withCookies())).data.data;
  check('simulated success settles as paid', verified.status === 'paid');
  check('result redirect is server generated', verified.redirectUrl.includes('status=success'));

  const duplicate = (await client.post('/payments/mock/verify', { token: session.checkoutToken, outcome: 'success' }, withCookies())).data.data;
  check('duplicate verification is idempotent', duplicate.duplicate === true);

  const badOutcome = await denied(() => client.post('/payments/mock/verify', { token: session.checkoutToken, outcome: 'successs' }, withCookies()));
  check('invalid scenario rejected by validation', badOutcome?.status === 400);

  const missingToken = await denied(() => client.post('/payments/mock/verify', { token: 'not-a-real-token', outcome: 'success' }, withCookies()));
  check('unknown checkout token rejected', missingToken?.status === 404);

  const paidOrder = (await client.get(`/orders/${successOrder.id}`, withCookies())).data.data;
  check('order payment status follows backend settlement', paidOrder.order.paymentStatus === 'paid');
  check('order finance snapshot preserved', paidOrder.order.platformRevenue === paidOrder.order.commissionTotal);

  // 2. Simulated failure
  const failedOrder = await checkout('mock', addressId, storeProfile.slug);
  const failedSession = (await client.post('/payments/mock/init', { orderId: failedOrder.id }, withCookies())).data.data;
  const failed = (await client.post('/payments/mock/verify', { token: failedSession.checkoutToken, outcome: 'failure' }, withCookies())).data.data;
  check('simulated failure settles as failed', failed.status === 'failed');

  // 3. Simulated cancellation
  const cancelOrder = await checkout('mock', addressId, storeProfile.slug);
  const cancelSession = (await client.post('/payments/mock/init', { orderId: cancelOrder.id }, withCookies())).data.data;
  const cancelled = (await client.post('/payments/mock/verify', { token: cancelSession.checkoutToken, outcome: 'cancel' }, withCookies())).data.data;
  check('simulated cancellation settles as cancelled', cancelled.status === 'cancelled');

  // 4. Buyer payment history and role isolation
  const history = (await client.get('/payments/history?limit=50', withCookies())).data;
  check('buyer sees payment history', history.data.length >= 3 && history.meta.total >= 3);
  check('buyer cannot open admin finance', (await denied(() => client.get('/admin/finance', withCookies())))?.status === 403);

  // 5. Seller balances before payout
  const seller = await signIn('seller@marketly.test', 'Seller@12345');
  const store = (await client.get('/sellers/me', withCookies())).data.data;
  const before = (await client.get('/sellers/me/finance', withCookies())).data.data;
  check('seller ledger exposes finance fields', typeof before.finance.available === 'number' && typeof before.finance.earnings === 'number');
  check('paid order credited the seller', before.finance.earnings > 0);

  // 6. COD order and collection
  await signIn('buyer@marketly.test', 'Buyer@12345');
  const codOrder = await checkout('cod', addressId, storeProfile.slug);
  check('COD order starts unpaid', codOrder.paymentStatus === 'pending');
  const codPayment = (await client.get(`/payments/${codOrder.id}`, withCookies())).data.data;
  check('COD transaction id is labelled offline', codPayment.transactionId.startsWith('COD-'));

  await signIn('admin@marketly.test', 'Admin@12345');
  const collected = (await client.patch(`/admin/orders/${codOrder.id}/delivery`, { paymentCollected: true, status: 'delivered' }, withCookies())).data.data;
  check('admin cash collection marks order paid', collected.paymentStatus === 'paid');
  const codAfter = (await client.get(`/payments/${codOrder.id}`, withCookies())).data.data;
  check('COD payment settled after collection', codAfter.status === 'paid');
  const doubleCollect = await denied(() => client.patch(`/admin/orders/${codOrder.id}/delivery`, { paymentCollected: true }, withCookies()));
  check('COD cannot be collected twice', doubleCollect?.status === 409 || doubleCollect?.status === 404);

  // 7. Seller COD item collection on a second COD order
  await signIn('buyer@marketly.test', 'Buyer@12345');
  const codOrder2 = await checkout('cod', addressId, storeProfile.slug);
  await signIn('seller@marketly.test', 'Seller@12345');
  const sellerOrders = (await client.get('/sellers/me/orders?limit=20', withCookies())).data.data;
  const match = sellerOrders.find((order) => order.id === codOrder2.id);
  check('seller sees the new COD order', Boolean(match));
  const item = match.items[0];
  const collectedItem = (await client.patch(`/orders/${codOrder2.id}/items/${item._id}`, { sellerStatus: 'delivered', codCollected: true }, withCookies())).data.data;
  check('seller cash confirmation recorded per item', collectedItem.items[0].codCollected === true);

  // 8. Admin finance, payouts and refund
  await signIn('admin@marketly.test', 'Admin@12345');
  const finance = (await client.get('/admin/finance', withCookies())).data.data;
  check('admin finance reports simulated mode', finance.simulatedOnly === true);
  check('admin finance reports collected funds', finance.collected > 0);
  const payments = (await client.get('/admin/payments?limit=50', withCookies())).data;
  check('admin payment dashboard is paginated', Array.isArray(payments.data) && payments.meta.total > 0);

  const payout = (await client.post('/admin/payouts', { sellerId: store.id, amount: 10, note: 'Verification payout' }, withCookies())).data.data;
  check('payout created as pending and simulated', payout.status === 'pending' && payout.simulated === true);
  const completed = (await client.patch(`/admin/payouts/${payout.id}`, { status: 'completed' }, withCookies())).data.data;
  check('payout can be completed by admin', completed.status === 'completed');

  await signIn('seller@marketly.test', 'Seller@12345');
  const afterPayout = (await client.get('/sellers/me/finance', withCookies())).data.data;
  check('seller ledger reflects completed payout', afterPayout.finance.paidOut >= before.finance.paidOut + 10);
  check('seller cannot create payouts', (await denied(() => client.post('/admin/payouts', { sellerId: store.id, amount: 5 }, withCookies())))?.status === 403);

  await signIn('admin@marketly.test', 'Admin@12345');
  const refundTarget = payments.data.find((row) => row.transactionId.startsWith('SIM-') && row.status === 'paid');
  check('a paid simulated payment exists for refund', Boolean(refundTarget));
  const refunded = (await client.post(`/admin/payments/${refundTarget.id}/refund`, { note: 'Verification refund' }, withCookies())).data.data;
  check('refund simulation updates payment status', refunded.status === 'refunded');
  const refundedOrder = (await client.get(`/orders/${refundTarget.orderId.id}`, withCookies())).data.data;
  check('refund couples order state', refundedOrder.order.paymentStatus === 'refunded' && refundedOrder.order.status === 'refunded');
  const blockedStatus = await denied(() => client.patch(`/admin/orders/${refundTarget.orderId.id}`, { status: 'refunded' }, withCookies()));
  check('admin cannot set refunded bypassing payments', blockedStatus?.status === 409);

  await signIn('seller@marketly.test', 'Seller@12345');
  const afterRefund = (await client.get('/sellers/me/finance', withCookies())).data.data;
  check('refund reverses seller ledger earnings', afterRefund.finance.refunds >= 10);

  console.log('\nAll portfolio payment checks passed.');
  console.log(`Signed in as: ${buyer.email}, ${seller.email}, admin`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
