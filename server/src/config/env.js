import dotenv from 'dotenv';

dotenv.config();

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const origins = (value) => [...new Set(
  String(value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
)];

const port = number(process.env.PORT, 5000);
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
const authUrl = (process.env.BETTER_AUTH_URL || `http://localhost:${port}`).replace(/\/+$/, '');
const corsOrigin = process.env.CORS_ORIGIN ? origins(process.env.CORS_ORIGIN)[0] : clientUrl;

export const env = {
  port,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.DB_NAME || 'marketly',
  authSecret: process.env.BETTER_AUTH_SECRET || '',
  authUrl,
  clientUrl,
  corsOrigin,
  allowVercelPreviews: String(process.env.ALLOW_VERCEL_PREVIEWS ?? 'false').toLowerCase() === 'true',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  ssl: {
    storeId: process.env.SSLCOMMERZ_STORE_ID || '',
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    sandbox: String(process.env.SSLCOMMERZ_SANDBOX ?? 'true').toLowerCase() !== 'false',
  },
  commissionPercent: number(process.env.COMMISSION_PERCENT, 10),
  shippingFee: number(process.env.FLAT_SHIPPING_FEE, 60),
  freeShippingOver: number(process.env.FREE_SHIPPING_OVER, 5000),
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

// Browser origins allowed by CORS. Keep this explicit in production.
export const corsOrigins = [...new Set([clientUrl, corsOrigin])];
// Better Auth also needs its own API origin for same-origin callbacks.
export const trustedOrigins = [...new Set([...corsOrigins, authUrl])];

export function validateProductionEnv() {
  if (!env.isProduction) return;
  const errors = [];

  if (!env.mongoUri) errors.push('MONGODB_URI');
  if (!env.authSecret || env.authSecret.length < 32 || /replace-with|development-secret/i.test(env.authSecret)) {
    errors.push('BETTER_AUTH_SECRET (use a unique random value of at least 32 characters)');
  }
  if (!/^https:\/\//.test(env.authUrl)) errors.push('BETTER_AUTH_URL (must be the public https Render URL)');
  if (!/^https:\/\//.test(env.clientUrl)) errors.push('CLIENT_URL (must be the public https Vercel URL)');
  if (!corsOrigins.length) errors.push('CORS_ORIGIN');

  if (errors.length) {
    throw new Error(`Invalid production configuration: ${errors.join('; ')}`);
  }
}
