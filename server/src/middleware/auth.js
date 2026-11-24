import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { SellerProfile } from '../models/seller-profile.js';
import { ApiError, asyncHandler } from '../utils/api.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) throw new ApiError(401, 'Please sign in to continue');
  if (session.user.status === 'suspended') throw new ApiError(403, 'This account has been suspended');
  req.user = session.user;
  req.session = session.session;
  next();
});

export const requireRole = (...roles) => [
  requireAuth,
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) throw new ApiError(403, 'You do not have permission for this action');
    next();
  },
];

export const requireBuyer = requireRole('buyer', 'admin');
export const requireSeller = requireRole('seller', 'admin');
export const requireAdmin = requireRole('admin');

export const requireActiveSeller = [
  requireAuth,
  asyncHandler(async (req, _res, next) => {
    const profile = await SellerProfile.findOne({ userId: req.user.id });
    if (!profile || (profile.status !== 'active' && req.user.role !== 'admin')) {
      throw new ApiError(403, 'An approved seller store is required for this action');
    }
    req.store = profile;
    next();
  }),
];

export async function sellerFilter(req) {
  if (req.user.role === 'admin' && req.query.sellerId) return String(req.query.sellerId);
  if (!req.store) req.store = await SellerProfile.findOne({ userId: req.user.id });
  if (!req.store) throw new ApiError(404, 'Seller store not found');
  return String(req.store._id);
}
