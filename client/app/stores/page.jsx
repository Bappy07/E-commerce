'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { catalog } from '@/services';
import { ProductGrid } from '@/components/store/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/store/empty-state';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { catalog.stores({ limit: 48 }).then((r) => setStores(r.data)).catch(() => setStores([])).finally(() => setLoading(false)); }, []);

  return (
    <div className="container-marketly py-12">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Independent stores</h1>
      <p className="mt-2 text-sm text-muted">Meet the people behind the products.</p>
      {loading && <div className="mt-10 grid gap-5 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>}
      {!loading && !stores.length && <div className="mt-10"><EmptyState title="No stores yet" description="Approved seller stores will appear here." /></div>}
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <Link key={store.id} href={`/stores/${store.slug}`} className="group overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative h-40 bg-secondary">
              {store.banner && <Image src={store.banner} alt={store.storeName} fill sizes="400px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold group-hover:text-accent">{store.storeName}</h2>
                <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{store.description || 'Thoughtfully selected products.'}</p>
              <p className="mt-4 text-xs text-muted">{store.productCount || 0} products · {store.stats?.totalOrders || 0} orders</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
