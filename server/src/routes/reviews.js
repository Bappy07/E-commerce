import { Router } from 'express';
import * as reviews from '../controllers/reviews.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewSchema } from '../validators.js';

const router = Router();
router.get('/:productId', reviews.listReviews);
router.post('/', requireAuth, validate(reviewSchema), reviews.createReview);
router.delete('/:id', requireAuth, reviews.deleteReview);
export default router;
