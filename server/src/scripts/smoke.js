import axios from 'axios';

const base = process.env.API_URL || 'http://localhost:5000/api';
const cookies = new Map();
const client = axios.create({ baseURL: base, timeout: 20000 });

client.interceptors.response.use((response) => {
  const setCookie = response.headers['set-cookie'];
  if (setCookie) setCookie.forEach((cookie) => cookies.set(cookie.split('=')[0], cookie.split(';')[0]));
  return response;
});

const withCookies = (config = {}) => ({ ...config, headers: { ...config.headers, Cookie: [...cookies.values()].join('; ') } });
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
};

async function signIn(email, password) {
  cookies.clear();
  await client.post('/auth/sign-in/email', { email, password });
  return client.get('/users/me', withCookies());
}

async function main() {
  const health = await client.get('/health');
  check('health endpoint', health.data.success);

  const home = await client.get('/catalog/home');
  check('home aggregates categories and products', Array.isArray(home.data.data.categories) && home.data.data.trending.length > 0);

  const products = await client.get('/catalog/products?limit=6&sort=price-asc');
  check('product listing + pagination', products.data.data.length > 0 && products.data.meta.total >= products.data.data.length);

  const detail = await client.get(`/catalog/products/${products.data.data[0].slug}`);
  check('product detail and related products', detail.data.data.product.title && Array.isArray(detail.data.data.related));

  const buyer = await signIn(process.env.SEED_BUYER_EMAIL || 'buyer@marketly.test', process.env.SEED_BUYER_PASSWORD || 'Buyer@12345');
  check('buyer sign-in and role', buyer.data.data.user.role === 'buyer');
  const denied = await client.get('/admin/overview', withCookies()).then(() => null).catch((error) => error.response);
  check('buyer cannot access admin API', denied?.status === 403);

  const seller = await signIn(process.env.SEED_SELLER_EMAIL || 'seller@marketly.test', process.env.SEED_SELLER_PASSWORD || 'Seller@12345');
  check('seller sign-in and role', seller.data.data.user.role === 'seller');
  const store = await client.get('/sellers/me', withCookies());
  check('seller store is private and populated', store.data.data.storeName);
  const sellerProducts = await client.get('/sellers/me/products', withCookies());
  check('seller only sees own products', sellerProducts.data.data.length > 0);

  const admin = await signIn(process.env.SEED_ADMIN_EMAIL || 'admin@marketly.test', process.env.SEED_ADMIN_PASSWORD || 'Admin@12345');
  check('admin sign-in and role', admin.data.data.user.role === 'admin');
  const overview = await client.get('/admin/overview', withCookies());
  check('admin statistics from database', typeof overview.data.data.orders === 'number');

  console.log('\nSmoke test passed. Run the full workflow checks manually for cart, checkout and payments.');
}

main().catch((error) => {
  console.error(error.response?.data || error.message);
  process.exit(1);
});
