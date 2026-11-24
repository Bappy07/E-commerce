import { Router } from 'express';
import * as payments from '../controllers/payments.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
// Gateway callbacks are public but verified with the gateway validation API.
router.get('/sslcommerz/success', payments.sslSuccess);
router.get('/sslcommerz/fail', payments.sslFail);
router.get('/sslcommerz/cancel', payments.sslCancel);
router.all('/sslcommerz/ipn', payments.sslIpn);
router.use(requireAuth);
router.post('/sslcommerz/init', payments.initSslPayment);
router.get('/:orderId', payments.getPayment);
export default router;
