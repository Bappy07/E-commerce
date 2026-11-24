import { Router } from 'express';
import * as payments from '../controllers/payments.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { mockInitSchema, mockVerifySchema } from '../validators.js';

const router = Router();
// Gateway callbacks are public; SSLCommerz callbacks are verified server-to-server.
router.get('/sslcommerz/success', payments.sslSuccess);
router.get('/sslcommerz/fail', payments.sslFail);
router.get('/sslcommerz/cancel', payments.sslCancel);
router.all('/sslcommerz/ipn', payments.sslIpn);

router.use(requireAuth);
router.get('/methods', payments.getMethods);
router.get('/history', payments.history);
router.get('/mock/session', payments.getMockSession);
router.post('/mock/init', validate(mockInitSchema), payments.initMock);
router.post('/mock/verify', validate(mockVerifySchema), payments.verifyMock);
router.post('/sslcommerz/init', payments.initSslPayment);
router.get('/:orderId', payments.getPayment);
export default router;
