import { Cart } from '../models/cart.js';
import { Product } from '../models/product.js';
import { ApiError, asyncHandler, ok } from '../utils/api.js';
import { productView } from '../utils/serialize.js';

async function getCartDoc(userId) {
  return (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
}

function line(item) {
  const product = item.productId;
  if (!product || product.status !== 'active' || !product.approved) return null;
  const variant = product.variants?.find((v) => v.key === item.variantKey);
  const unitPrice = variant ? variant.price : product.price;
  const stock = variant ? variant.stock : product.stock;
  return {
    id: String(item._id),
    product: productView(product),
    variantKey: item.variantKey || '',
    variantName: variant?.name || '',
    unitPrice,
    quantity: item.quantity,
    availableStock: stock,
    lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
    inStock: item.quantity <= stock,
  };
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id }).populate({
    path: 'items.productId',
    populate: [{ path: 'categoryId', select: 'name slug' }, { path: 'sellerId', select: 'storeName slug' }],
  }).lean();
  const items = (cart?.items || []).map(line).filter(Boolean);
  ok(res, { items, count: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0) });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantKey, quantity } = req.body;
  const product = await Product.findOne({ _id: productId, status: 'active', approved: true });
  if (!product) throw new ApiError(404, 'Product not found');
  const variant = variantKey ? product.variants.find((v) => v.key === variantKey) : null;
  if (variantKey && !variant) throw new ApiError(400, 'Variant not found');
  const stock = variant ? variant.stock : product.stock;
  if (!stock) throw new ApiError(409, 'This item is out of stock');

  const cart = await getCartDoc(req.user.id);
  const existing = cart.items.find((item) => String(item.productId) === String(productId) && (item.variantKey || '') === (variantKey || ''));
  if (existing) existing.quantity = Math.min(stock, existing.quantity + quantity);
  else cart.items.push({ productId, variantKey: variantKey || '', quantity: Math.min(stock, quantity) });
  await cart.save();
  ok(res, { count: cart.items.reduce((sum, item) => sum + item.quantity, 0) }, 'Added to cart');
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await getCartDoc(req.user.id);
  const item = cart.items.id(req.params.id);
  if (!item) throw new ApiError(404, 'Cart item not found');
  const product = await Product.findById(item.productId);
  const variant = product?.variants?.find((v) => v.key === item.variantKey);
  const stock = variant ? variant.stock : product?.stock || 0;
  if (req.body.quantity > stock) throw new ApiError(409, `Only ${stock} available`);
  item.quantity = req.body.quantity;
  await cart.save();
  ok(res, { quantity: item.quantity }, 'Cart updated');
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getCartDoc(req.user.id);
  if (!cart.items.id(req.params.id)) throw new ApiError(404, 'Cart item not found');
  cart.items.id(req.params.id).deleteOne();
  await cart.save();
  ok(res, null, 'Item removed');
});

export const clearCart = asyncHandler(async (req, res) => {
  await Cart.updateOne({ userId: req.user.id }, { $set: { items: [] } });
  ok(res, null, 'Cart cleared');
});
