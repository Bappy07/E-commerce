import { Router } from 'express';
import * as catalog from '../controllers/catalog.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();
router.post('/newsletter', validate(z.object({ email: z.string().email() })), catalog.subscribe);
router.post('/contact', validate(z.object({ name: z.string().min(2), email: z.string().email(), subject: z.string().min(2), message: z.string().min(10) })), catalog.contact);
router.get('/home', catalog.home);
router.get('/categories', catalog.listCategories);
router.get('/products', catalog.listProducts);
router.get('/products/:slug', catalog.getProduct);
router.get('/stores', catalog.listStores);
router.get('/stores/:slug', catalog.getStore);
export default router;
