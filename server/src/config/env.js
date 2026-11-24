import dotenv from 'dotenv';

dotenv.config();

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  port: number(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.DB_NAME || 'marketly',
  authSecret: process.env.BETTER_AUTH_SECRET || '',
  authUrl: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  ssl: {
    storeId: process.env.SSLCOMMERZ_STORE_ID || '',
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    sandbox: String(process.env.SSLCOMMERZ_SANDBOX ?? 'true') !== 'false',
  },
  commissionPercent: number(process.env.COMMISSION_PERCENT, 10),
  shippingFee: number(process.env.FLAT_SHIPPING_FEE, 60),
  freeShippingOver: number(process.env.FREE_SHIPPING_OVER, 5000),
  isProduction: process.env.NODE_ENV === 'production',
};

export const corsOrigins = [...new Set([env.clientUrl, env.corsOrigin, env.authUrl])];
