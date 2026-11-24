import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { env, corsOrigins } from './env.js';
import { mongoClient, mongoDb } from './db.js';

const roleField = {
  type: 'string',
  defaultValue: 'buyer',
  input: false, // never accept role from public registration
};

export const auth = betterAuth({
  appName: 'MARKETLY',
  baseURL: env.authUrl,
  secret: env.authSecret || 'marketly-development-secret-change-me',
  // Match the plural collection names used by the Mongoose models (users, sessions, accounts, verifications).
  database: mongodbAdapter(mongoDb, { client: mongoClient, transaction: true, usePlural: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: roleField,
      status: { type: 'string', defaultValue: 'active', input: false },
      phone: { type: 'string', required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: corsOrigins,
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.isProduction ? 'none' : 'lax',
      secure: env.isProduction,
      httpOnly: true,
    },
  },
});
