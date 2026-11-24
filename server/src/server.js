import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env, validateProductionEnv } from './config/env.js';

validateProductionEnv();

connectDB()
  .then(() => {
    const server = app.listen(env.port, env.host, () => {
      console.log(`MARKETLY API ready on http://${env.host}:${env.port}/api`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Closing server...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
