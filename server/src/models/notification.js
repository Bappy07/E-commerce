import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  type: { type: String, enum: ['order', 'payment', 'application', 'system'], default: 'system' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);
