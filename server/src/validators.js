import { z } from 'zod';

const text = (max = 200) => z.string().trim().max(max);
const id = z.string().min(1, 'Invalid id');

export const addressSchema = z.object({
  label: text(40).default('Home'),
  name: text(80).min(2, 'Name is required'),
  phone: text(30).min(6, 'Phone is required'),
  line1: text(160).min(3, 'Address is required'),
  line2: text(160).optional().default(''),
  city: text(80).min(2, 'City is required'),
  district: text(80).optional().default(''),
  postalCode: text(20).optional().default(''),
  country: text(60).optional().default('Bangladesh'),
  isDefault: z.boolean().optional().default(false),
});

export const profileSchema = z.object({
  name: text(80).min(2).optional(),
  phone: text(30).optional(),
  image: z.string().url().optional().or(z.literal('')),
});

export const applicationSchema = z.object({
  storeName: text(80).min(2, 'Store name is required'),
  message: text(1000).min(10, 'Tell us a little about your store (at least 10 characters)'),
  phone: text(30).min(6, 'Phone is required'),
});

export const storeSchema = z.object({
  storeName: text(80).min(2).optional(),
  description: text(1000).optional(),
  logo: z.string().optional().default(''),
  banner: z.string().optional().default(''),
  contact: z.object({
    email: z.string().optional().default(''),
    phone: text(30).optional().default(''),
    address: text(200).optional().default(''),
  }).optional().default({}),
}).partial();

const variantSchema = z.object({
  key: text(60).optional().default(''),
  name: text(60).min(1),
  sku: text(60).optional().default(''),
  price: z.coerce.number().positive('Variant price must be positive'),
  stock: z.coerce.number().int().min(0).default(0),
});

export const productSchema = z.object({
  title: text(140).min(3, 'Title is required'),
  categoryId: id,
  description: text(5000).optional().default(''),
  brand: text(80).optional().default(''),
  price: z.coerce.number().positive('Price must be positive'),
  compareAtPrice: z.coerce.number().min(0).optional().default(0),
  stock: z.coerce.number().int().min(0).default(0),
  images: z.array(z.object({ url: z.string().min(1), publicId: z.string().optional().default('') })).min(1, 'Add at least one image'),
  variants: z.array(variantSchema).optional().default([]),
  sku: text(60).optional().default(''),
  tags: z.array(text(40)).optional().default([]),
  status: z.enum(['active', 'draft', 'archived']).optional().default('active'),
});

export const cartItemSchema = z.object({
  productId: id,
  variantKey: z.string().optional().default(''),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export const cartUpdateSchema = z.object({ quantity: z.coerce.number().int().min(1).max(20) });

export const orderSchema = z.object({
  addressId: id,
  paymentMethod: z.enum(['cod', 'mock', 'sslcommerz']),
  note: text(300).optional().default(''),
});

export const mockInitSchema = z.object({
  orderId: id,
  method: z.enum(['card', 'mobile-banking', 'bank-transfer']).optional().default('card'),
});

// "outcome" only chooses a simulated gateway scenario. The backend maps it to a status.
export const mockVerifySchema = z.object({
  token: z.string().min(10),
  outcome: z.enum(['success', 'failure', 'cancel']),
});

export const deliverySchema = z.object({
  status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentCollected: z.boolean().optional(),
  note: text(300).optional().default(''),
}).refine((data) => data.status !== undefined || data.paymentCollected !== undefined, {
  message: 'Provide a delivery status or payment collection flag',
});

export const payoutSchema = z.object({
  sellerId: id,
  amount: z.coerce.number().positive(),
  note: text(300).optional().default(''),
});

export const payoutStatusSchema = z.object({
  status: z.enum(['completed', 'cancelled']),
  note: text(300).optional().default(''),
});

export const reviewSchema = z.object({
  productId: id,
  orderId: id.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: text(1000).min(5, 'Review is too short'),
});

export const categorySchema = z.object({
  name: text(80).min(2),
  description: text(500).optional().default(''),
  image: z.string().optional().default(''),
  active: z.boolean().optional().default(true),
});

export const applicationDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: text(500).optional().default(''),
});

export const adminUserSchema = z.object({
  status: z.enum(['active', 'suspended']).optional(),
  role: z.enum(['buyer', 'seller', 'admin']).optional(),
}).refine((data) => data.status || data.role, { message: 'Provide status or role' });

export const adminSellerSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended', 'rejected']),
});

export const adminProductSchema = z.object({
  approved: z.boolean().optional(),
  featured: z.boolean().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
});

export const adminOrderSchema = z.object({ status: z.enum(['processing', 'shipped', 'delivered', 'cancelled', 'refunded']) });
export const sellerOrderSchema = z.object({
  sellerStatus: z.enum(['processing', 'shipped', 'delivered', 'cancelled']),
  codCollected: z.boolean().optional(),
});

export const inventorySchema = z.object({
  stock: z.coerce.number().int().min(0).optional(),
  variantKey: z.string().optional().default(''),
  variantStock: z.coerce.number().int().min(0).optional(),
}).refine((data) => data.stock !== undefined || data.variantStock !== undefined, { message: 'Provide a stock value' });

export const refundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  note: text(300).optional().default(''),
});

export const settingsSchema = z.object({
  commissionPercent: z.coerce.number().min(0).max(50).optional(),
  shippingFee: z.coerce.number().min(0).optional(),
  freeShippingOver: z.coerce.number().min(0).optional(),
  siteName: text(60).optional(),
});
