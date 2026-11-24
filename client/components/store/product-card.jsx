'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { cn } from '@/lib/utils';

export function ProductCard({ product, priority = false }) {
  const { user } = useAuth();
  const { add } = useCart();
  const wishlist = useWishlist();
  const id = product.id || product._id;
  const image = product.images?.[0]?.url;
  const discount = product.compareAtPrice > product.price ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const saved = wishlist.has(id);

  const addToCart = async (event) => {
    event.preventDefault();
    if (!user) return toast.error('Please sign in to add items to your cart');
    try {
      await add({ productId: id, quantity: 1 });
      toast.success('Added to cart');
    } catch (error) { toast.error(error.message); }
  };

  const toggleWishlist = async (event) => {
    event.preventDefault();
    if (!user) return toast.error('Please sign in to save items');
    try { await wishlist.toggle(id); toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist'); }
    catch (error) { toast.error(error.message); }
  };

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.35)]">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary">
          {image ? <Image src={image} alt={product.title} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" priority={priority} /> : <div className="grid h-full place-items-center text-xs text-muted">No image</div>}
          {discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-accent px-2 py-1 text-[11px] font-semibold text-white">-{discount}%</span>}
          {product.stock === 0 && <span className="absolute bottom-3 left-3 rounded-full bg-foreground px-2 py-1 text-[11px] text-white">Out of stock</span>}
        </div>
      </Link>
      <button onClick={toggleWishlist} aria-label="Save to wishlist" className={cn('absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-border bg-card/95 transition-colors hover:text-accent', saved && 'text-accent')}>
        <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
      </button>
      <div className="p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
          <span className="truncate">{product.store?.name || product.storeName || 'Marketly seller'}</span>
          {product.rating?.count > 0 && <span className="ml-auto flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{product.rating.average}</span>}
        </div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-10 text-sm font-medium leading-5 hover:text-accent">{product.title}</Link>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{money(product.price)}</span>
            {product.compareAtPrice > product.price && <span className="text-xs text-muted line-through">{money(product.compareAtPrice)}</span>}
          </div>
          <Button size="sm" variant="outline" onClick={addToCart} disabled={product.stock === 0}>Add</Button>
        </div>
      </div>
    </article>
  );
}
