import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import catalog from './catalog.js';
import users from './users.js';
import cart from './cart.js';
import orders from './orders.js';
import payments from './payments.js';
import sellers from './sellers.js';
import admin from './admin.js';
import reviews from './reviews.js';
import upload from './upload.js';

const router = Router();
router.get('/health', (_req, res) => res.json({
  success: true,
  data: {
    status: 'ok',
    app: 'MARKETLY API',
    env: env.nodeEnv,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  },
}));
router.use('/catalog', catalog);
router.use('/users', users);
router.use('/cart', cart);
router.use('/orders', orders);
router.use('/payments', payments);
router.use('/sellers', sellers);
router.use('/admin', admin);
router.use('/reviews', reviews);
router.use('/upload', upload);
export default router;
