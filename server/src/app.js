import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.js';
import { corsOrigins, env } from './config/env.js';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // health checks and server-to-server calls
  if (corsOrigins.includes(origin)) return true;
  return env.allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
};

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204,
}));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 400, standardHeaders: 'draft-7', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, skipSuccessfulRequests: true });
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Better Auth must receive the raw request stream, before express.json().
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json({ limit: '1mb' }));
app.use('/api', api);
app.get('/', (_req, res) => res.json({ success: true, data: { app: 'MARKETLY', env: env.nodeEnv } }));
app.use(notFound);
app.use(errorHandler);

export default app;
