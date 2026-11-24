import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);
