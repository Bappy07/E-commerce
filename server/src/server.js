import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

connectDB()
  .then(() => {
    app.listen(env.port, () => console.log(`MARKETLY API ready on http://localhost:${env.port}/api`));
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
