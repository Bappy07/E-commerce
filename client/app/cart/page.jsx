'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { money } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/store/empty-state';

export default function CartPage() {
  const { cart, update, remove } = useCart();
  const { user } = useAuth();

  const change = async (item, quantity) => {
    try { await update(item.id, quantity); }
    catch (error) { toast.error(error.message); }
  };

  return (
    <div className="container-marketly py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
      <p className="mt-2 text-sm text-muted">{cart.count} item{cart.count === 1 ? '' : 's'} in your cart</p>

      {!cart.items.length ? (
        <div className="mt-10"><EmptyState title="Your cart is empty" description="Browse the marketplace and find something worth keeping." href="/shop" action="Start shopping" /></div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-4 border-b border-border p-4 last:border-0">
                <Link href={`/products/${item.product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {item.product.images?.[0]?.url && <Image src={item.product.images[0].url} alt={item.product.title} fill sizes="96px" className="object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.product.slug}`} className="font-medium hover:text-accent">{item.product.title}</Link>
                  {item.variantName && <p className="text-xs text-muted">{item.variantName}</p>}
                  <p className="mt-1 text-sm font-semibold">{money(item.unitPrice)}</p>
                  {!item.inStock && <p className="mt-1 text-xs text-red-600">Only {item.availableStock} available</p>}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-8 items-center rounded-md border border-input">
                      <button className="grid h-full w-8 place-items-center text-muted" onClick={() => change(item, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button className="grid h-full w-8 place-items-center text-muted" onClick={() => change(item, item.quantity + 1)} disabled={item.quantity >= item.availableStock} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button onClick={() => remove(item.id)} className="text-xs text-muted hover:text-red-600"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Remove</button>
                  </div>
                </div>
                <p className="shrink-0 font-medium">{money(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Order summary</h2>
            <div className="mt-5 flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>{money(cart.subtotal)}</span></div>
            <div className="mt-3 flex justify-between text-sm"><span className="text-muted">Delivery</span><span className="text-muted">Calculated at checkout</span></div>
            <div className="mt-5 flex justify-between border-t border-border pt-4 font-semibold"><span>Total</span><span>{money(cart.subtotal)}</span></div>
            <Button asChild size="lg" className="mt-6 w-full"><Link href={user ? '/checkout' : '/login'}>{user ? 'Continue to checkout' : 'Sign in to checkout'}</Link></Button>
            <Link href="/shop" className="mt-4 block text-center text-xs text-muted hover:text-accent">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
