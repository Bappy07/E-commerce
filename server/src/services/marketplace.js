import mongoose from 'mongoose';
import { Setting } from '../models/setting.js';
import { Notification } from '../models/notification.js';
import { env } from '../config/env.js';
import { round2 } from '../utils/api.js';

const DEFAULTS = {
  siteName: 'MARKETLY',
  commissionPercent: env.commissionPercent,
  shippingFee: env.shippingFee,
  freeShippingOver: env.freeShippingOver,
};

export async function getSettings() {
  const stored = await Setting.findOne({ key: 'marketplace' }).lean();
  return { ...DEFAULTS, ...(stored?.value || {}) };
}

export const commissionFor = (amount, commissionPercent) => round2((Number(amount) * Number(commissionPercent)) / 100);

export async function notify(userId, title, body = '', type = 'system', link = '') {
  if (!userId) return;
  await Notification.create({ userId, title, body, type, link });
}

export const isObjectId = (value) => mongoose.isValidObjectId(String(value || ''));
