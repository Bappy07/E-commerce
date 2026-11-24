const obj = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc || {});

export const userView = (user) => {
  const u = obj(user);
  return {
    id: u.id || String(u._id),
    name: u.name,
    email: u.email,
    image: u.image || '',
    role: u.role || 'buyer',
    status: u.status || 'active',
    phone: u.phone || '',
  };
};

export const storeView = (store) => {
  const s = obj(store);
  return {
    id: String(s._id), storeName: s.storeName, slug: s.slug,
    description: s.description || '', logo: s.logo || '', banner: s.banner || '',
    contact: s.contact || {}, status: s.status, stats: s.stats || {},
    application: s.application || null, createdAt: s.createdAt, updatedAt: s.updatedAt,
    user: s.userId?.name ? { id: String(s.userId._id || s.userId), name: s.userId.name, email: s.userId.email, image: s.userId.image || '' } : null,
  };
};

export const productView = (product) => {
  const p = obj(product);
  return {
    ...p,
    id: String(p._id),
    category: p.categoryId && p.categoryId.name ? { id: String(p.categoryId._id), name: p.categoryId.name, slug: p.categoryId.slug } : null,
    store: p.sellerId && p.sellerId.storeName ? { id: String(p.sellerId._id), name: p.sellerId.storeName, slug: p.sellerId.slug } : null,
  };
};

export const orderView = (order) => {
  const o = obj(order);
  return { ...o, id: String(o._id) };
};
