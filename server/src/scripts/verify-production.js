import dotenv from 'dotenv';

dotenv.config();

const verifyPort = Number(process.env.VERIFY_PORT || 5055);
const clientUrl = process.env.VERIFY_CLIENT_URL || 'https://marketly.vercel.app';

process.env.NODE_ENV = 'production';
process.env.PORT = String(verifyPort);
process.env.HOST = '0.0.0.0';
process.env.CLIENT_URL = clientUrl;
process.env.CORS_ORIGIN = clientUrl;
process.env.BETTER_AUTH_URL = 'https://marketly-api.onrender.com';
process.env.ALLOW_VERCEL_PREVIEWS = 'false';

const { env, corsOrigins, validateProductionEnv } = await import('../config/env.js');
const { default: app } = await import('../app.js');
const { connectDB, disconnectDB } = await import('../config/db.js');

const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`PASS: ${label}`);
};

function finish(server, code) {
  server.close(async () => {
    await disconnectDB().catch(() => {});
    process.exit(code);
  });
}

try {
  validateProductionEnv();
  check('production environment validation', true);
  await connectDB();
  check('MongoDB Atlas connection', true);

  const server = app.listen(env.port, env.host, async () => {
    try {
      const address = server.address();
      check('binds to 0.0.0.0', address?.address === '0.0.0.0', address?.address);
      check('uses process.env.PORT', env.port === verifyPort, String(env.port));

      const base = `http://127.0.0.1:${env.port}`;
      const health = await fetch(`${base}/api/health`);
      const body = await health.json();
      check('GET /api/health responds', health.status === 200 && body.success === true);
      check('health reports database state', body.data?.db === 'connected', body.data?.db);

      const allowed = await fetch(`${base}/api/health`, {
        method: 'OPTIONS',
        headers: { Origin: corsOrigins[0], 'Access-Control-Request-Method': 'GET' },
      });
      check('configured Vercel origin allowed', allowed.headers.get('access-control-allow-origin') === corsOrigins[0]);
      check('credentials allowed', allowed.headers.get('access-control-allow-credentials') === 'true');

      const denied = await fetch(`${base}/api/health`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example.com', 'Access-Control-Request-Method': 'GET' },
      });
      check('unknown origin rejected', !denied.headers.get('access-control-allow-origin'));

      console.log('\nLocal production configuration verified. Render deployment itself has NOT been verified.');
      finish(server, 0);
    } catch (error) {
      console.error(error.message);
      finish(server, 1);
    }
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
