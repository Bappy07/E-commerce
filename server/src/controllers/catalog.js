import { Category } from '../models/category.js';
import { Product } from '../models/product.js';
import { SellerProfile } from '../models/seller-profile.js';
import { Newsletter } from '../models/newsletter.js';
import { ContactMessage } from '../models/contact-message.js';
import { ApiError, asyncHandler, ok, pagination } from '../utils/api.js';
import { isObjectId } from '../services/marketplace.js';
import { productView, storeView } from '../utils/serialize.js';

const PUBLIC = { status: 'active', approved: true };
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const productPopulate = [
  { path: 'categoryId', select: 'name slug' },
  { path: 'sellerId', select: 'storeName slug logo status' },
];

async function resolveFilter(query) {
  const filter = { ...PUBLIC };
  if (query.search) {
    const term = { $regex: escapeRegex(query.search), $options: 'i' };
    filter.$or = [{ title: term }, { description: term }, { brand: term }, { tags: term }];
  }
  if (query.category && isObjectId(query.category)) filter.categoryId = query.category;
  else if (query.categorySlug) {
    const category = await Category.findOne({ slug: query.categorySlug });
    filter.categoryId = category?._id || new Category()._id;
  }
  if (query.storeSlug) {
    const store = await SellerProfile.findOne({ slug: query.storeSlug, status: 'active' });
    filter.sellerId = store?._id || new SellerProfile()._id;
  }
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.featured === 'true') filter.featured = true;
  if (query.offer === 'true') filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
  return filter;
}

const SORTS = {
  newest: { createdAt: -1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 },
  popular: { sold: -1 }, rating: { 'rating.average': -1 },
};

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = await resolveFilter(req.query);
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const [items, total] = await Promise.all([
    Product.find(filter).populate(productPopulate).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  ok(res, items.map(productView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const home = asyncHandler(async (_req, res) => {
  const [categories, featured, trending, bestSellers, offers, stores] = await Promise.all([
    Category.aggregate([
      { $match: { active: true } },
      { $lookup: { from: 'products', localField: '_id', foreignField: 'categoryId', pipeline: [{ $match: PUBLIC }], as: 'products' } },
      { $project: { name: 1, slug: 1, image: 1, description: 1, productCount: { $size: '$products' } } },
      { $sort: { productCount: -1 } }, { $limit: 8 },
    ]),
    Product.find(PUBLIC).populate(productPopulate).sort({ featured: -1, createdAt: -1 }).limit(8).lean(),
    Product.find(PUBLIC).populate(productPopulate).sort({ views: -1 }).limit(8).lean(),
    Product.find(PUBLIC).populate(productPopulate).sort({ sold: -1 }).limit(8).lean(),
    Product.find({ ...PUBLIC, $expr: { $gt: ['$compareAtPrice', '$price'] } }).populate(productPopulate).limit(8).lean(),
    SellerProfile.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'products', localField: '_id', foreignField: 'sellerId', pipeline: [{ $match: PUBLIC }], as: 'products' } },
      { $project: { storeName: 1, slug: 1, logo: 1, banner: 1, description: 1, stats: 1, productCount: { $size: '$products' } } },
      { $sort: { productCount: -1 } }, { $limit: 6 },
    ]),
  ]);
  ok(res, {
    categories, featured: featured.map(productView), trending: trending.map(productView),
    bestSellers: bestSellers.map(productView), offers: offers.map(productView), stores: stores.map(storeView),
  });
});

export const subscribe = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  await Newsletter.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
  ok(res, null, 'Subscribed successfully');
});

export const contact = asyncHandler(async (req, res) => {
  await ContactMessage.create(req.body);
  ok(res, null, 'Message sent. We will get back to you shortly.');
});

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.aggregate([
    { $match: { active: true } },
    { $lookup: { from: 'products', localField: '_id', foreignField: 'categoryId', pipeline: [{ $match: PUBLIC }], as: 'products' } },
    { $project: { name: 1, slug: 1, image: 1, description: 1, productCount: { $size: '$products' } } },
    { $sort: { name: 1 } },
  ]);
  ok(res, categories);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, ...PUBLIC }).populate(productPopulate).lean();
  if (!product) throw new ApiError(404, 'Product not found');
  await Product.updateOne({ _id: product._id }, { $inc: { views: 1 } });
  const related = await Product.find({ categoryId: product.categoryId, _id: { $ne: product._id }, ...PUBLIC })
    .populate(productPopulate).limit(8).lean();
  ok(res, { product: productView(product), related: related.map(productView) });
});

export const listStores = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { status: 'active' };
  if (req.query.search) filter.storeName = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([
    SellerProfile.find(filter).select('storeName slug logo banner description stats').sort({ 'stats.totalSales': -1 }).skip(skip).limit(limit).lean(),
    SellerProfile.countDocuments(filter),
  ]);
  ok(res, items.map(storeView), null, 200, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const getStore = asyncHandler(async (req, res) => {
  const store = await SellerProfile.findOne({ slug: req.params.slug, status: 'active' }).lean();
  if (!store) throw new ApiError(404, 'Store not found');
  const products = await Product.find({ sellerId: store._id, ...PUBLIC }).populate(productPopulate).limit(24).lean();
  ok(res, { store: storeView(store), products: products.map(productView) });
});
