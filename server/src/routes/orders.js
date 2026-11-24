import { Router } from 'express';
import * as orders from '../controllers/orders.js';
import { requireAuth, requireSeller } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderSchema, sellerOrderSchema } from '../validators.js';
import * as sellers from '../controllers/sellers.js';

const router = Router();
router.use(requireAuth);
router.post('/', validate(orderSchema), orders.createOrder);
router.get('/', orders.listMyOrders);
router.get('/:id', orders.getOrder);
router.post('/:id/cancel', orders.cancelOrder);
router.patch('/:id/items/:itemId', requireSeller, validate(sellerOrderSchema), sellers.updateSellerOrderItem);
export default router;
