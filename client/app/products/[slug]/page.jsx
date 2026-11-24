'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Heart, Minus, Plus, ShieldCheck, Star, Store as StoreIcon, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { catalog, reviewService } from '@/services';
import { money, shortDate } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/store/empty-state';
import { ProductGrid } from '@/components/store/product-grid';
import { SectionHeading } from '@/components/store/section-heading';
import { cn } from '@/lib/utils';

export default function ProductPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { add } = useCart();
  const wishlist = useWishlist();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [image, setImage] = useState(0);
  const [variant, setVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    catalog.product(slug)
      .then((result) => {
        if (!active) return;
        setData(result);
        setVariant(result.product.variants?.[0]?.key || '');
        reviewService.list(result.product.id).then(setReviews).catch(() => {});
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);

  const product = data?.product;
  const chosen = useMemo(() => product?.variants?.find((v) => v.key === variant), [product, variant]);
  const price = chosen ? chosen.price : product?.price || 0;
  const stock = chosen ? chosen.stock : product?.stock || 0;
  const images = product?.images?.length ? product.images : [];
  const saved = product && wishlist.has(product.id);

  const addToCart = async () => {
    if (!user) return toast.error('Please sign in to add items to your cart');
    try { await add({ productId: product.id, variantKey: variant, quantity }); toast.success('Added to cart'); }
    catch (e) { toast.error(e.message); }
  };

  const buyNow = async () => {
    await addToCart();
    if (user) router.push('/cart');
  };

  const toggleWishlist = async () => {
    if (!user) return toast.error('Please sign in to save items');
    try { await wishlist.toggle(product.id); toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist'); }
    catch (e) { toast.error(e.message); }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    try {
      await reviewService.create({ productId: product.id, rating, comment });
      setComment('');
      setReviews(await reviewService.list(product.id));
      toast.success('Thank you for your review');
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="container-marketly grid gap-10 py-12 lg:grid-cols-2"><Skeleton className="aspect-square" /><div className="grid gap-4 py-10"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-5 w-1/3" /><Skeleton className="h-24" /><Skeleton className="h-12 w-48" /></div></div>;
  if (error || !product) return <div className="container-marketly py-16"><EmptyState title="Product unavailable" description={error || 'This product does not exist.'} href="/shop" /></div>;

  return (
    <div className="container-marketly py-10">
      <div className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/shop" className="hover:text-accent">Shop</Link><span>/</span>
        {product.category && <><Link href={`/shop?category=${product.category.slug}`} className="hover:text-accent">{product.category.name}</Link><span>/</span></>}
        <span className="truncate text-foreground">{product.title}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary">
            {images[image]?.url && <Image src={images[image].url} alt={product.title} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" priority />}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((item, index) => (
                <button key={index} onClick={() => setImage(index)} className={cn('relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-secondary', image === index ? 'border-accent' : 'border-transparent')}>
                  <Image src={item.url} alt={`${product.title} ${index + 1}`} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              {product.brand && <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">{product.brand}</p>}
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{product.title}</h1>
            </div>
            <button onClick={toggleWishlist} aria-label="Save to wishlist" className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border hover:text-accent', saved && 'text-accent')}>
              <Heart className="h-5 w-5" fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-muted">
            {product.rating?.count > 0 && <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {product.rating.average} ({product.rating.count} reviews)</span>}
            <span>{product.sold || 0} sold</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{money(price)}</span>
            {product.compareAtPrice > price && <><span className="text-base text-muted line-through">{money(product.compareAtPrice)}</span><Badge tone="danger">Save {Math.round((1 - price / product.compareAtPrice) * 100)}%</Badge></>}
          </div>

          {product.variants?.length > 0 && (
            <div className="mt-7">
              <p className="mb-3 text-sm font-medium">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((item) => (
                  <button key={item.key} onClick={() => { setVariant(item.key); setQuantity(1); }} className={cn('rounded-md border px-3 py-2 text-sm transition-colors', variant === item.key ? 'border-foreground bg-foreground text-white' : 'border-border hover:border-foreground')}>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7">
            <p className="mb-3 text-sm font-medium">Quantity</p>
            <div className="flex items-center gap-4">
              <div className="flex h-10 items-center rounded-md border border-input">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="grid h-full w-10 place-items-center text-muted hover:text-foreground" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))} className="grid h-full w-10 place-items-center text-muted hover:text-foreground" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
              </div>
              <span className={cn('text-xs', stock ? 'text-muted' : 'text-red-600')}>{stock ? `${stock} available` : 'Out of stock'}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={addToCart} disabled={!stock}>Add to cart</Button>
            <Button size="lg" variant="outline" onClick={buyNow} disabled={!stock}>Buy now</Button>
          </div>

          <div className="mt-8 grid gap-3 border-t border-border pt-6 text-sm text-muted sm:grid-cols-2">
            <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent" /> Delivery across Bangladesh</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Verified seller</span>
          </div>

          {product.store && (
            <Link href={`/stores/${product.store.slug}`} className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-accent">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary"><StoreIcon className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium">{product.store.name}</p><p className="text-xs text-muted">Visit storefront</p></div>
            </Link>
          )}
        </div>
      </div>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Description</h2>
          <p className="whitespace-pre-line text-sm leading-7 text-muted">{product.description || 'No description provided.'}</p>
          {product.tags?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{product.tags.map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}</div>}
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold">Reviews ({reviews.length})</h2>
          <form onSubmit={submitReview} className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} stars`}><Star className={cn('h-5 w-5', value <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300')} /></button>)}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience with this product" required minLength={5} />
            <Button type="submit" size="sm" className="mt-3">Post review</Button>
          </form>
          <div className="grid gap-4">
            {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet. Be the first.</p>}
            {reviews.map((review) => (
              <div key={review._id} className="border-b border-border pb-4 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{review.userId?.name || 'Customer'}</span>
                  <span className="text-xs text-muted">{shortDate(review.createdAt)}</span>
                </div>
                <div className="mt-1 flex gap-0.5">{Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                <p className="mt-2 text-sm leading-6 text-muted">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {data.related?.length > 0 && (
        <section className="mt-20">
          <SectionHeading title="You may also like" href={product.category ? `/shop?category=${product.category.slug}` : '/shop'} />
          <ProductGrid products={data.related} />
        </section>
      )}
    </div>
  );
}
