import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { Category } from '../models/category.js';
import { SellerProfile } from '../models/seller-profile.js';
import { Product } from '../models/product.js';
import { extraProducts } from '../data/extra-products.js';

export async function seedExtraProducts() {
  const categories = await Category.find().lean();
  const stores = await SellerProfile.find({ status: 'active' }).sort({ createdAt: 1 }).lean();
  if (!categories.length || !stores.length) throw new Error('Run the base seed first so categories and stores exist.');

  const categoryIds = new Map(categories.map((category) => [category.name, category._id]));
  let index = 0;

  for (const item of extraProducts) {
    const categoryId = categoryIds.get(item.category);
    if (!categoryId) throw new Error(`Unknown category: ${item.category}`);
    const sellerId = stores[index % stores.length]._id;

    await Product.findOneAndUpdate({ slug: item.slug }, {
      $set: {
        title: item.title,
        categoryId,
        sellerId,
        description: `${item.title} — thoughtfully selected for everyday use, with clean design and dependable quality.`,
        brand: 'MARKETLY',
        price: item.price,
        compareAtPrice: item.compareAt,
        stock: item.stock,
        sku: item.sku,
        images: [{ url: `/products/${item.slug}.svg`, publicId: '' }],
        variants: [],
        tags: [item.category.toLowerCase(), 'new arrival'],
        status: 'active',
        approved: true,
        featured: false,
        sold: (index * 5) % 23 + 2,
        rating: { average: Number((3.9 + (index % 10) / 10).toFixed(1)), count: (index * 3) % 19 + 3 },
      },
    }, { upsert: true });
    index += 1;
  }

  return extraProducts.length;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    await connectDB();
    const count = await seedExtraProducts();
    console.log(`Extra products seeded: ${count}`);
    await disconnectDB();
  } catch (error) {
    console.error('Extra product seed failed:', error.message);
    process.exit(1);
  }
}
