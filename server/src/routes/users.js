import { Router } from 'express';
import * as users from '../controllers/users.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addressSchema, applicationSchema, profileSchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.get('/me', users.getMe);
router.patch('/me', validate(profileSchema), users.updateMe);
router.post('/seller-application', validate(applicationSchema), users.applySeller);
router.get('/seller-application/me', users.myApplication);
router.get('/addresses', users.listAddresses);
router.post('/addresses', validate(addressSchema), users.createAddress);
router.patch('/addresses/:id', validate(addressSchema.partial()), users.updateAddress);
router.delete('/addresses/:id', users.deleteAddress);
router.get('/wishlist', users.getWishlist);
router.post('/wishlist/:productId', users.toggleWishlist);
router.delete('/wishlist/:productId', users.toggleWishlist);
router.get('/reviews', users.myReviews);
router.get('/notifications', users.listNotifications);
router.patch('/notifications/read', users.markNotificationsRead);

export default router;
