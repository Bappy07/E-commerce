import { Router } from 'express';
import * as admin from '../controllers/admin.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminOrderSchema, adminProductSchema, adminSellerSchema, adminUserSchema, applicationDecisionSchema,
  categorySchema, deliverySchema, payoutSchema, payoutStatusSchema, refundSchema, settingsSchema,
} from '../validators.js';

const router = Router();
router.use(requireAdmin);
router.get('/overview', admin.overview);
router.get('/users', admin.listUsers);
router.patch('/users/:id', validate(adminUserSchema), admin.updateUser);
router.get('/sellers', admin.listSellers);
router.patch('/sellers/:id', validate(adminSellerSchema), admin.updateSeller);
router.get('/applications', admin.listApplications);
router.patch('/applications/:id', validate(applicationDecisionSchema), admin.decideApplication);
router.get('/categories', admin.listCategories);
router.post('/categories', validate(categorySchema), admin.createCategory);
router.put('/categories/:id', validate(categorySchema), admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);
router.get('/products', admin.listProducts);
router.patch('/products/:id', validate(adminProductSchema), admin.updateProduct);
router.delete('/products/:id', admin.deleteProduct);
router.get('/orders', admin.listOrders);
router.patch('/orders/:id', validate(adminOrderSchema), admin.updateOrder);
router.patch('/orders/:id/delivery', validate(deliverySchema), admin.updateDelivery);
router.get('/payments', admin.listPayments);
router.post('/payments/:id/refund', validate(refundSchema), admin.refundPayment);
router.get('/finance', admin.finance);
router.get('/payouts', admin.listPayouts);
router.post('/payouts', validate(payoutSchema), admin.createPayout);
router.patch('/payouts/:id', validate(payoutStatusSchema), admin.updatePayout);
router.get('/commissions', admin.commissions);
router.get('/analytics', admin.analytics);
router.get('/settings', admin.getSettings);
router.put('/settings', validate(settingsSchema), admin.updateSettings);
router.delete('/reviews/:id', admin.deleteReview);
export default router;
