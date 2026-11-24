import { connectDB, disconnectDB } from '../config/db.js';
import { auth } from '../config/auth.js';
import { User } from '../models/user.js';
import { SellerProfile } from '../models/seller-profile.js';
import { Category } from '../models/category.js';
import { Product } from '../models/product.js';
import { Address } from '../models/address.js';
import { Wishlist } from '../models/wishlist.js';
import { Setting } from '../models/setting.js';
import { env } from '../config/env.js';
import { slugify, uniqueSlug } from '../utils/common.js';
import { seedExtraProducts } from './seed-extra-products.js';

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

const categories = [
  ['Electronics', 'Latest gadgets and audio', img('photo-1498049794561-7780e7231661')],
  ['Fashion', 'Everyday essentials and style', img('photo-1483985988355-763728e1935b')],
  ['Home & Living', 'Thoughtful pieces for your space', img('photo-1555041469-a586c61ea9bc')],
  ['Beauty', 'Skincare and fragrance', img('photo-1596462502278-27bfdc403348')],
  ['Sports', 'Gear for an active life', img('photo-1517836357463-d25dfeac3438')],
  ['Books', 'Stories worth keeping', img('photo-1507842217343-583bb7270b66')],
];

const products = [
  ['Studio Wireless Headphones', 'Electronics', 18900, 24900, 24, 'Immersive sound with all-day comfort and a clean, minimal finish.', 'photo-1505740420928-5e560c06d30e', ['Black', 'Sand'], 'AUDIO-01'],
  ['Minimalist Smart Watch', 'Electronics', 24500, 29900, 18, 'A refined everyday watch with activity tracking and a crisp display.', 'photo-1523275335684-37898b6baf30', ['Black', 'Silver'], 'WATCH-01'],
  ['Everyday Canvas Sneakers', 'Fashion', 6200, 8500, 40, 'Lightweight canvas sneakers built for daily movement.', 'photo-1542291026-7eec264c27ff', ['White', 'Black'], 'SHOE-01'],
  ['Leather Weekender Bag', 'Fashion', 14900, 18900, 15, 'A structured weekend bag with a soft leather touch.', 'photo-1553062407-98eeb64c6a62', ['Tan', 'Black'], 'BAG-01'],
  ['Classic Film Camera', 'Electronics', 32500, 39000, 9, 'A timeless compact camera for photographs with character.', 'photo-1526170375885-4d8ecf77b99f', ['Silver'], 'CAM-01'],
  ['14-inch Ultrabook', 'Electronics', 89000, 102000, 7, 'A slim, fast laptop for work and creativity on the move.', 'photo-1496181133206-80ce9b88a853', ['Graphite', 'Silver'], 'LAPTOP-01'],
  ['Signature Eau de Parfum', 'Beauty', 7800, 9500, 30, 'A warm, understated fragrance for everyday wear.', 'photo-1541643600914-78b084683601', ['50ml', '100ml'], 'PERFUME-01'],
  ['Ceramic Pour-Over Set', 'Home & Living', 5400, 6900, 22, 'A calm morning ritual, brewed with precision.', 'photo-1495474472287-4d71bcdd2085', ['Matte White'], 'HOME-01'],
  ['Linen Throw Blanket', 'Home & Living', 4600, 5800, 35, 'Breathable linen with a relaxed, lived-in texture.', 'photo-1584100936595-c0654b55a2e2', ['Oat', 'Sage'], 'HOME-02'],
  ['Yoga Performance Mat', 'Sports', 3900, 4900, 50, 'A grippy, cushioned mat for every practice.', 'photo-1592432678016-e910b452f9a2', ['Charcoal', 'Clay'], 'SPORT-01'],
  ['Stainless Steel Bottle', 'Sports', 2200, 2900, 60, 'Keeps drinks cold for 24 hours and hot for 12.', 'photo-1602143407151-7111542de6e8', ['500ml', '750ml'], 'SPORT-02'],
  ['The Quiet Library Edition', 'Books', 1850, 2400, 45, 'A collectible hardcover for slow evenings.', 'photo-1544947950-fa07a98d237f', ['Hardcover'], 'BOOK-01'],
];

async function ensureUser(email, password, name, role) {
  let user = await User.findOne({ email });
  if (!user) {
    await auth.api.signUpEmail({ body: { name, email, password } });
    user = await User.findOne({ email });
  }
  await User.updateOne({ _id: user._id }, { $set: { role, status: 'active', name, phone: user.phone || '01700000000' } });
  return User.findOne({ email }).lean();
}

async function main() {
  await connectDB();
  await Setting.findOneAndUpdate({ key: 'marketplace' }, {
    $setOnInsert: { value: { siteName: 'MARKETLY', commissionPercent: 10, shippingFee: 60, freeShippingOver: 5000 } },
  }, { upsert: true });

  const admin = await ensureUser(process.env.SEED_ADMIN_EMAIL || env.seedAdminEmail || 'admin@marketly.test', process.env.SEED_ADMIN_PASSWORD || 'Admin@12345', 'Marketly Admin', 'admin');
  const seller = await ensureUser(process.env.SEED_SELLER_EMAIL || env.seedSellerEmail || 'seller@marketly.test', process.env.SEED_SELLER_PASSWORD || 'Seller@12345', 'Ayesha Rahman', 'seller');
  const buyer = await ensureUser(process.env.SEED_BUYER_EMAIL || env.seedBuyerEmail || 'buyer@marketly.test', process.env.SEED_BUYER_PASSWORD || 'Buyer@12345', 'Rahim Uddin', 'buyer');
  const secondSeller = await ensureUser('studio@marketly.test', 'Studio@12345', 'Studio North', 'seller');
  const thirdSeller = await ensureUser('living@marketly.test', 'Living@12345', 'Living Co.', 'seller');

  const categoryIds = {};
  for (const [name, description, image] of categories) {
    const slug = slugify(name);
    await Category.findOneAndUpdate({ slug }, { $set: { name, description, image, active: true } }, { upsert: true });
    categoryIds[name] = (await Category.findOne({ slug }).lean())._id;
  }

  const stores = [
    { user: seller, name: 'Northline Studio', description: 'Considered essentials for work, travel and everyday life.', image: img('photo-1441986300917-64674bd600d8') },
    { user: secondSeller, name: 'Studio North', description: 'Modern objects and accessories, selected with care.', image: img('photo-1497366216548-37526070297c') },
    { user: thirdSeller, name: 'Living Co.', description: 'Warm, simple pieces for a slower home.', image: img('photo-1618221195710-dd6b41faaea6') },
  ];
  const storeIds = [];
  for (const store of stores) {
    await SellerProfile.findOneAndUpdate({ userId: store.user._id }, {
      $set: {
        storeName: store.name, slug: slugify(store.name), description: store.description,
        banner: store.image, logo: '', contact: { email: store.user.email, phone: '01700000000', address: 'Dhaka, Bangladesh' },
        status: 'active', application: { submittedAt: new Date(), reviewedAt: new Date(), reviewedBy: String(admin._id) },
      },
    }, { upsert: true });
    storeIds.push((await SellerProfile.findOne({ userId: store.user._id }).lean())._id);
  }

  let index = 0;
  for (const [title, categoryName, price, compareAt, stock, description, photo, variants, sku] of products) {
    const slug = slugify(title);
    await Product.findOneAndUpdate({ slug }, {
      $set: {
        title, categoryId: categoryIds[categoryName], sellerId: storeIds[index % storeIds.length],
        description, price, compareAtPrice: compareAt, stock, sku,
        images: [{ url: img(photo), publicId: '' }],
        variants: variants.map((name, i) => ({ key: slugify(name), name, sku: `${sku}-${i + 1}`, price: price + i * 400, stock: Math.ceil(stock / variants.length) })),
        status: 'active', approved: true, featured: index < 4, sold: (index * 7) % 31 + 3,
        rating: { average: Number((4 + (index % 5) / 10).toFixed(1)), count: (index * 3) % 17 + 4 },
        tags: [categoryName.toLowerCase(), 'featured'],
      },
    }, { upsert: true });
    index += 1;
  }

  await Address.findOneAndUpdate({ userId: buyer._id, label: 'Home' }, {
    $set: { userId: buyer._id, label: 'Home', name: buyer.name, phone: '01711112222', line1: '12 Green Road', city: 'Dhaka', district: 'Dhaka', postalCode: '1205', country: 'Bangladesh', isDefault: true },
  }, { upsert: true });
  await Wishlist.findOneAndUpdate({ userId: buyer._id }, { $setOnInsert: { productIds: [] } }, { upsert: true });
  await uniqueSlug('unused', Category);
  const extraCount = await seedExtraProducts();

  console.log('\nSeed complete.');
  console.log(`Admin:  ${admin.email} / ${process.env.SEED_ADMIN_PASSWORD || 'Admin@12345'}`);
  console.log(`Seller: ${seller.email} / ${process.env.SEED_SELLER_PASSWORD || 'Seller@12345'}`);
  console.log(`Buyer:  ${buyer.email} / ${process.env.SEED_BUYER_PASSWORD || 'Buyer@12345'}`);
  console.log(`Stores: ${stores.map((store) => store.name).join(', ')}`);
  console.log(`Products: ${products.length + extraCount} (${products.length} curated + ${extraCount} catalog additions)\n`);
  await disconnectDB();
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
