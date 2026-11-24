import mongoose from 'mongoose';

// Better Auth owns this collection. Keep the schema permissive so new auth fields do not break it.
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  image: String,
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  phone: String,
}, { collection: 'users', strict: false, timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
export const User = mongoose.model('User', userSchema);
