import axios from 'axios';

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

async function signUp(name, email, password) {
  cookies.clear();
  await client.post('/auth/sign-up/email', { name, email, password });
  return (await client.get('/users/me', withCookies())).data.data.user;
}

const idOf = (doc) => {
  if (doc == null) return '';
  if (typeof doc === 'object' && doc.id) return String(doc.id);
  if (typeof doc === 'object' && doc._id) return String(doc._id);
  return String(doc);
};
const stamp = Date.now();

async function main() {
  // Buyer: cart and server-calculated totals
  const buyer = await signIn('buyer@marketly.test', 'Buyer@12345');
  check('buyer sign-in', buyer.role === 'buyer');

  const addresses = (await client.get('/users/addresses', withCookies())).data.data;
  check('buyer has a saved address', addresses.length > 0);
  const addressId = idOf(addresses[0]);

  const listing = (await client.get('/catalog/products?limit=1')).data.data;
  check('catalog returns a product', listing.length > 0);
  const slug = listing[0].slug;
  const before = (await client.get(`/catalog/products/${slug}`)).data.data.product;
  const variant = before.variants?.[0];
  const variantKey = variant?.key || '';
  const stockBefore = variant ? variant.stock : before.stock;

  await client.delete('/cart', withCookies());
  await client.post('/cart', { productId: before.id, variantKey, quantity: 1 }, withCookies());
  const cart = (await client.get('/cart', withCookies())).data.data;
  check('cart item added with server-calculated subtotal', cart.count === 1 && cart.subtotal > 0);

  const savedCookies = [...cookies.entries()];
  cookies.clear();
  const unauthCart = await denied(() => client.get('/cart', withCookies()));
  savedCookies.forEach(([key, value]) => cookies.set(key, value));
  check('cart requires authentication', unauthCart?.status === 401);

  // Checkout and stock movement
  const order = (await client.post('/orders', {
    addressId, paymentMethod: 'cod', note: 'Automated workflow verification',
  }, withCookies())).data.data;
  check('COD order created from server-priced cart', Boolean(order.id) && order.total > 0);
  check('commission and seller earnings recorded', order.commissionTotal >= 0 && order.sellerEarningTotal >= 0);

  const after = (await client.get(`/catalog/products/${slug}`)).data.data.product;
  const variantAfter = after.variants?.find((v) => v.key === variantKey);
  const stockAfter = variantAfter ? variantAfter.stock : after.stock;
  check('stock decremented after checkout', stockAfter === stockBefore - 1, `${stockBefore} -> ${stockAfter}`);

  // Seller isolation
  const sellerCredentials = [
    ['seller@marketly.test', 'Seller@12345'],
    ['studio@marketly.test', 'Studio@12345'],
    ['living@marketly.test', 'Living@12345'],
  ];
  let owner = null;
  let other = null;
  for (const [email, password] of sellerCredentials) {
    await signIn(email, password);
    const myProducts = (await client.get('/sellers/me/products', withCookies())).data.data;
    if (myProducts.some((product) => idOf(product) === idOf(before))) owner = { email, password };
    else if (!other) other = { email, password };
  }
  check('ordered product belongs to an approved seller', Boolean(owner));

  await signIn(owner.email, owner.password);
  const store = (await client.get('/sellers/me', withCookies())).data.data;
  const sellerOrders = (await client.get('/sellers/me/orders', withCookies())).data.data;
  check('seller sees the new order', sellerOrders.some((entry) => idOf(entry) === idOf(order)));

  const sellerOrder = (await client.get(`/orders/${order.id}`, withCookies())).data.data;
  check('seller order detail is filtered to their items',
    sellerOrder.order.items.length > 0 && sellerOrder.order.items.every((item) => idOf(item.sellerId) === idOf(store)));
  const item = sellerOrder.order.items[0];
  const itemId = idOf(item);

  const fulfilled = (await client.patch(`/orders/${order.id}/items/${itemId}`, {
    sellerStatus: 'processing',
  }, withCookies())).data.data;
  check('seller updates their own order item',
    fulfilled.items.length > 0 && fulfilled.items.every((entry) => idOf(entry.sellerId) === idOf(store)) && fulfilled.items[0].sellerStatus === 'processing');

  if (other) {
    await signIn(other.email, other.password);
    const crossSeller = await denied(() => client.patch(`/orders/${order.id}/items/${itemId}`, {
      sellerStatus: 'shipped',
    }, withCookies()));
    check('seller cannot update another store’s item', crossSeller?.status === 404);
  }

  // Admin operations
  await signIn('admin@marketly.test', 'Admin@12345');
  const overview = (await client.get('/admin/overview', withCookies())).data.data;
  check('admin overview reads from database', typeof overview.orders === 'number');
  const adminOrders = (await client.get('/admin/orders', withCookies())).data.data;
  check('admin sees the order', adminOrders.some((entry) => idOf(entry) === idOf(order)));
  const adminUpdated = (await client.patch(`/admin/orders/${order.id}`, {
    status: 'processing',
  }, withCookies())).data.data;
  check('admin updates order status', adminUpdated.status === 'processing');

  // Seller application lifecycle
  const applicantEmail = `workflow-${stamp}@marketly.test`;
  const applicant = await signUp('Workflow Applicant', applicantEmail, 'Workflow@12345');
  check('public registration defaults to buyer', applicant.role === 'buyer');

  const application = (await client.post('/users/seller-application', {
    storeName: `Workflow Store ${stamp}`,
    message: 'Automated verification of the seller application lifecycle.',
    phone: '01700000000',
  }, withCookies())).data.data;
  check('buyer submits seller application', Boolean(application.id));

  await signIn('admin@marketly.test', 'Admin@12345');
  const applications = (await client.get('/admin/applications', withCookies())).data.data;
  check('admin sees the application', applications.some((entry) => idOf(entry) === idOf(application)));
  const decision = (await client.patch(`/admin/applications/${application.id}`, {
    decision: 'approve', note: 'Approved by workflow verification',
  }, withCookies())).data.data;
  check('admin approves the application', decision.status === 'active');

  await signIn(applicantEmail, 'Workflow@12345');
  const approvedMe = (await client.get('/users/me', withCookies())).data.data;
  check('approved applicant becomes a seller', approvedMe.user.role === 'seller');
  const approvedStore = (await client.get('/sellers/me', withCookies())).data.data;
  check('approved seller can access store API', Boolean(approvedStore.storeName));

  // Seller product CRUD
  const categories = (await client.get('/catalog/categories', withCookies())).data.data;
  const categoryId = idOf(categories[0]);
  const created = (await client.post('/sellers/me/products', {
    title: `Workflow Product ${stamp}`,
    categoryId,
    description: 'Created during automated verification.',
    price: 1234,
    stock: 5,
    images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', publicId: '' }],
    status: 'active',
  }, withCookies())).data.data;
  check('seller creates a product', Boolean(created.id));

  const inventory = (await client.patch(`/sellers/me/inventory/${created.id}`, {
    stock: 9,
  }, withCookies())).data.data;
  check('seller updates inventory', inventory.stock === 9);
  await client.delete(`/sellers/me/products/${created.id}`, withCookies());
  check('seller deletes the product', true);

  // Cancellation and stock restoration
  await signIn('buyer@marketly.test', 'Buyer@12345');
  const cancelled = (await client.post(`/orders/${order.id}/cancel`, {}, withCookies())).data.data;
  check('buyer cancels the COD order', cancelled.status === 'cancelled');

  const restored = (await client.get(`/catalog/products/${slug}`)).data.data.product;
  const restoredVariant = restored.variants?.find((v) => v.key === variantKey);
  const restoredStock = restoredVariant ? restoredVariant.stock : restored.stock;
  check('stock restored after cancellation', restoredStock === stockBefore, `${stockAfter} -> ${restoredStock}`);

  const payment = (await client.get(`/payments/${order.id}`, withCookies())).data.data;
  check('COD payment record marked cancelled', payment.status === 'cancelled');

  console.log('\nWorkflow verification passed: cart → checkout → stock → seller isolation → admin → application → product CRUD → cancellation.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error.response?.data || error.message);
  process.exit(1);
});
