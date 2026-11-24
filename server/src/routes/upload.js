import { Router } from 'express';
import * as upload from '../controllers/upload.js';
import { requireActiveSeller } from '../middleware/auth.js';
import { productImages } from '../middleware/upload.js';

const router = Router();
router.post('/product-images', requireActiveSeller, productImages, upload.uploadProductImages);
export default router;
