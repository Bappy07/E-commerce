import { User } from '../models/user.js';
import { SellerProfile } from '../models/seller-profile.js';
import { Address } from '../models/address.js';
import { Wishlist } from '../models/wishlist.js';
import { Notification } from '../models/notification.js';
import { Product } from '../models/product.js';
import { Review } from '../models/review.js';
import { ApiError, asyncHandler, ok, pagination } from '../utils/api.js';
import { uniqueSlug, escapeText } from '../utils/common.js';
import { userView, storeView, productView } from '../utils/serialize.js';
import { notify } from '../services/marketplace.js';

export const getMe = asyncHandler(async (req, res) => {
  const store = await SellerProfile.findOne({ userId: req.user.id }).lean();
  ok(res, { user: userView(req.user), store: store ? storeView(store) : null });
});

export const updateMe = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $set: req.body });
  const user = await User.findById(req.user.id).lean();
  ok(res, userView(user), 'Profile updated');
});

export const applySeller = asyncHandler(async (req, res) => {
  const existing = await SellerProfile.findOne({ userId: req.user.id });
  if (existing && ['pending', 'active'].includes(existing.status)) {
    throw new ApiError(409, existing.status === 'pending' ? 'Your application is already pending' : 'You already have a seller store');
  }
  const profile = await SellerProfile.create({
    userId: req.user.id,
    storeName: escapeText(req.body.storeName),
    slug: await uniqueSlug(req.body.storeName, SellerProfile),
    description: escapeText(req.body.message),
    contact: { phone: req.body.phone, email: req.user.email },
    status: 'pending',
    application: { message: escapeText(req.body.message), submittedAt: new Date() },
  });
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  await Promise.all(admins.map((admin) => notify(admin._id, 'New seller application', profile.storeName, 'application', '/dashboard/admin/applications')));
  ok(res, storeView(profile), 'Application submitted. An admin will review it shortly.', 201);
});

export const myApplication = asyncHandler(async (req, res) => {
  const profile = await SellerProfile.findOne({ userId: req.user.id }).lean();
  if (!profile) throw new ApiError(404, 'No seller application found');
  ok(res, storeView(profile));
});

export const listAddresses = asyncHandler(async (req, res) => {
  ok(res, await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 }).lean());
});

export const createAddress = asyncHandler(async (req, res) => {
  if (req.body.isDefault) await Address.updateMany({ userId: req.user.id }, { $set: { isDefault: false } });
  const address = await Address.create({ ...req.body, userId: req.user.id, line2: req.body.line2 || '', district: req.body.district || '', postalCode: req.body.postalCode || '', country: req.body.country || 'Bangladesh' });
  ok(res, address, 'Address saved', 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, userId: req.user.id });
  if (!address) throw new ApiError(404, 'Address not found');
  if (req.body.isDefault) await Address.updateMany({ userId: req.user.id }, { $set: { isDefault: false } });
  Object.assign(address, req.body);
  await address.save();
  ok(res, address, 'Address updated');
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!address) throw new ApiError(404, 'Address not found');
  ok(res, null, 'Address removed');
});

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user.id }).populate({
    path: 'productIds', match: { status: 'active', approved: true }, populate: productPopulate,
  }).lean();
  ok(res, (wishlist?.productIds || []).map(productView));
});

const productPopulate = [{ path: 'categoryId', select: 'name slug' }, { path: 'sellerId', select: 'storeName slug' }];

export const toggleWishlist = asyncHandler(async (req, res) => {
  const product = await Product.exists({ _id: req.params.productId, status: 'active', approved: true });
  if (!product) throw new ApiError(404, 'Product not found');
  let wishlist = await Wishlist.findOne({ userId: req.user.id });
  if (!wishlist) wishlist = new Wishlist({ userId: req.user.id, productIds: [] });
  const index = wishlist.productIds.findIndex((id) => String(id) === String(req.params.productId));
  if (index >= 0) wishlist.productIds.splice(index, 1);
  else wishlist.productIds.push(req.params.productId);
  await wishlist.save();
  ok(res, { saved: index < 0 }, index < 0 ? 'Added to wishlist' : 'Removed from wishlist');
});

export const myReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ userId: req.user.id }).populate('productId', 'title slug images').sort({ createdAt: -1 }).lean();
  ok(res, reviews);
});

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const [items, unread] = await Promise.all([
    Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments({ userId: req.user.id, read: false }),
  ]);
  ok(res, items, null, 200, { unread, page, limit });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
  ok(res, null, 'Notifications marked as read');
});
