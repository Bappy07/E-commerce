import api, { unwrap, unwrapPage } from './api';

export const authService = {
  session: () => api.get('/auth/get-session').then((r) => r.data),
  register: (body) => unwrap(api.post('/auth/sign-up/email', body)),
  login: (body) => unwrap(api.post('/auth/sign-in/email', body)),
  logout: () => api.post('/auth/sign-out'),
};

export const catalog = {
  home: () => unwrap(api.get('/catalog/home')),
  categories: () => unwrap(api.get('/catalog/categories')),
  products: (params) => unwrapPage(api.get('/catalog/products', { params })),
  product: (slug) => unwrap(api.get(`/catalog/products/${slug}`)),
  stores: (params) => unwrapPage(api.get('/catalog/stores', { params })),
  store: (slug) => unwrap(api.get(`/catalog/stores/${slug}`)),
};

export const account = {
  me: () => unwrap(api.get('/users/me')),
  update: (body) => unwrap(api.patch('/users/me', body)),
  applySeller: (body) => unwrap(api.post('/users/seller-application', body)),
  myApplication: () => unwrap(api.get('/users/seller-application/me')),
  addresses: () => unwrap(api.get('/users/addresses')),
  addAddress: (body) => unwrap(api.post('/users/addresses', body)),
  updateAddress: (id, body) => unwrap(api.patch(`/users/addresses/${id}`, body)),
  deleteAddress: (id) => unwrap(api.delete(`/users/addresses/${id}`)),
  wishlist: () => unwrap(api.get('/users/wishlist')),
  toggleWishlist: (id) => unwrap(api.post(`/users/wishlist/${id}`)),
  reviews: () => unwrap(api.get('/users/reviews')),
  deleteReview: (id) => unwrap(api.delete(`/reviews/${id}`)),
  notifications: (params) => unwrapPage(api.get('/users/notifications', { params })),
  readNotifications: () => unwrap(api.patch('/users/notifications/read')),
};

export const cartService = {
  get: () => unwrap(api.get('/cart')),
  add: (body) => unwrap(api.post('/cart', body)),
  update: (id, quantity) => unwrap(api.patch(`/cart/${id}`, { quantity })),
  remove: (id) => unwrap(api.delete(`/cart/${id}`)),
  clear: () => unwrap(api.delete('/cart')),
};

export const orderService = {
  create: (body) => unwrap(api.post('/orders', body)),
  mine: (params) => unwrapPage(api.get('/orders', { params })),
  get: (id) => unwrap(api.get(`/orders/${id}`)),
  cancel: (id) => unwrap(api.post(`/orders/${id}/cancel`)),
};

export const paymentService = {
  init: (orderId) => unwrap(api.post('/payments/sslcommerz/init', { orderId })),
  get: (orderId) => unwrap(api.get(`/payments/${orderId}`)),
};

export const reviewService = {
  list: (productId) => unwrap(api.get(`/reviews/${productId}`)),
  create: (body) => unwrap(api.post('/reviews', body)),
  remove: (id) => unwrap(api.delete(`/reviews/${id}`)),
};

export const sellerService = {
  store: () => unwrap(api.get('/sellers/me')),
  updateStore: (body) => unwrap(api.patch('/sellers/me', body)),
  products: (params) => unwrapPage(api.get('/sellers/me/products', { params })),
  product: (id) => unwrap(api.get(`/sellers/me/products/${id}`)),
  createProduct: (body) => unwrap(api.post('/sellers/me/products', body)),
  updateProduct: (id, body) => unwrap(api.put(`/sellers/me/products/${id}`, body)),
  deleteProduct: (id) => unwrap(api.delete(`/sellers/me/products/${id}`)),
  inventory: (id, body) => unwrap(api.patch(`/sellers/me/inventory/${id}`, body)),
  orders: (params) => unwrapPage(api.get('/sellers/me/orders', { params })),
  updateOrderItem: (orderId, itemId, body) => unwrap(api.patch(`/orders/${orderId}/items/${itemId}`, body)),
  earnings: (params) => unwrap(api.get('/sellers/me/earnings', { params })),
  commissions: () => unwrap(api.get('/sellers/me/commissions')),
};

export const adminService = {
  overview: () => unwrap(api.get('/admin/overview')),
  users: (params) => unwrapPage(api.get('/admin/users', { params })),
  updateUser: (id, body) => unwrap(api.patch(`/admin/users/${id}`, body)),
  sellers: (params) => unwrapPage(api.get('/admin/sellers', { params })),
  updateSeller: (id, body) => unwrap(api.patch(`/admin/sellers/${id}`, body)),
  applications: () => unwrap(api.get('/admin/applications')),
  decideApplication: (id, body) => unwrap(api.patch(`/admin/applications/${id}`, body)),
  categories: () => unwrap(api.get('/admin/categories')),
  createCategory: (body) => unwrap(api.post('/admin/categories', body)),
  updateCategory: (id, body) => unwrap(api.put(`/admin/categories/${id}`, body)),
  deleteCategory: (id) => unwrap(api.delete(`/admin/categories/${id}`)),
  products: (params) => unwrapPage(api.get('/admin/products', { params })),
  updateProduct: (id, body) => unwrap(api.patch(`/admin/products/${id}`, body)),
  deleteProduct: (id) => unwrap(api.delete(`/admin/products/${id}`)),
  orders: (params) => unwrapPage(api.get('/admin/orders', { params })),
  updateOrder: (id, body) => unwrap(api.patch(`/admin/orders/${id}`, body)),
  payments: () => unwrap(api.get('/admin/payments')),
  refund: (id, body) => unwrap(api.post(`/admin/payments/${id}/refund`, body)),
  commissions: () => unwrap(api.get('/admin/commissions')),
  analytics: (params) => unwrap(api.get('/admin/analytics', { params })),
  settings: () => unwrap(api.get('/admin/settings')),
  updateSettings: (body) => unwrap(api.put('/admin/settings', body)),
  deleteReview: (id) => unwrap(api.delete(`/admin/reviews/${id}`)),
};

export const uploadService = {
  productImages: (files) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return unwrap(api.post('/upload/product-images', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
};
