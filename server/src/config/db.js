import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { env } from './env.js';

export const mongoClient = new MongoClient(env.mongoUri || 'mongodb://127.0.0.1:27017');
export const mongoDb = mongoClient.db(env.dbName);

let connected = false;

export async function connectDB() {
  if (connected) return;
  if (!env.mongoUri) throw new Error('MONGODB_URI is missing. Copy server/.env.example to server/.env and add your Atlas URI.');

  await Promise.all([
    mongoose.connect(env.mongoUri, { dbName: env.dbName, serverSelectionTimeoutMS: 10000 }),
    mongoClient.connect(),
  ]);

  connected = true;
  console.log(`MongoDB connected: ${env.dbName}`);
}

export async function disconnectDB() {
  if (!connected) return;
  await Promise.allSettled([mongoose.disconnect(), mongoClient.close()]);
  connected = false;
}

export async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    // Standalone MongoDB has no transactions; Atlas replica sets do.
    if (/Transaction numbers are only allowed|does not support transactions|not supported/i.test(error.message)) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
