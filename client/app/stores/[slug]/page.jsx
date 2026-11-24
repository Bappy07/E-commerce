'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Store as StoreIcon } from 'lucide-react';
import { catalog } from '@/services';
import { ProductGrid } from '@/components/store/product-grid';
import { SectionHeading } from '@/components/store/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/store/empty-state';

export default function StorefrontPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { catalog.store(slug).then(setData).catch((e) => setError(e.message)); }, [slug]);

  if (error) return <div className="container-marketly py-16"><EmptyState title="Store not found" description={error} href="/stores" /></div>;
  if (!data) return <div className="container-marketly py-10"><Skeleton className="h-48 w-full" /><Skeleton className="mt-10 h-80 w-full" /></div>;

  const { store, products } = data;
  return (
    <div>
      <div className="relative h-56 border-b border-border bg-secondary md:h-72">
        {store.banner && <Image src={store.banner} alt={store.storeName} fill sizes="100vw" className="object-cover" priority />}
        <div className="absolute inset-0 bg-black/35" />
        <div className="container-marketly absolute inset-x-0 bottom-0 pb-8">
          <div className="flex items-end gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl border border-white/30 bg-white/90"><StoreIcon className="h-6 w-6" /></div>
            <div className="text-white">
              <h1 className="text-3xl font-semibold tracking-tight">{store.storeName}</h1>
              <p className="mt-1 text-sm text-white/80">{products.length} products · {store.stats?.totalOrders || 0} orders</p>
            </div>
          </div>
        </div>
      </div>
      <div className="container-marketly py-12">
        <p className="max-w-2xl text-sm leading-7 text-muted">{store.description || 'Thoughtfully selected products.'}</p>
        <div className="mt-10">
          <SectionHeading title="All products" />
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}
