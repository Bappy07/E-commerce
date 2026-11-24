import { Router } from 'express';
import * as cart from '../controllers/cart.js';
import { requireBuyer, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cartItemSchema, cartUpdateSchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.get('/', cart.getCart);
router.post('/', validate(cartItemSchema), cart.addToCart);
router.patch('/:id', validate(cartUpdateSchema), cart.updateCartItem);
router.delete('/:id', cart.removeCartItem);
router.delete('/', cart.clearCart);
export default router;
