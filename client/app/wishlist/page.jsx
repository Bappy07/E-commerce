'use client';

import { useEffect } from 'react';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/hooks/use-auth';
import { ProductGrid } from '@/components/store/product-grid';
import { EmptyState } from '@/components/store/empty-state';

export default function WishlistPage() {
  const { user } = useAuth();
  const { items, refresh } = useWishlist();
  useEffect(() => { if (user) refresh(); }, [user?.id]);

  return (
    <div className="container-marketly py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Wishlist</h1>
      <p className="mt-2 text-sm text-muted">Things you saved for later.</p>
      <div className="mt-8">
        {!user ? <EmptyState title="Sign in to see your wishlist" description="Your saved products will appear here." href="/login" action="Sign in" /> : <ProductGrid products={items} />}
      </div>
    </div>
  );
}
