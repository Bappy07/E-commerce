import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  label: { type: String, default: 'Home' },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String, default: '' },
  city: { type: String, required: true },
  district: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  country: { type: String, default: 'Bangladesh' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export const Address = mongoose.model('Address', addressSchema);
