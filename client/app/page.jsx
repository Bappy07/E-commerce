'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Leaf, Truck } from 'lucide-react';
import { catalog } from '@/services';
import { ProductGrid } from '@/components/store/product-grid';
import { SectionHeading } from '@/components/store/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/store/empty-state';

export default function HomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    catalog.home().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="container-marketly grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted"><BadgeCheck className="h-3.5 w-3.5 text-accent" /> Independent sellers, considered objects</span>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.055em] md:text-6xl lg:text-7xl">
              Better things,<br />from better <span className="text-accent">places.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted">Discover a marketplace built around quality rather than noise. Thoughtful products from independent sellers, delivered with care.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/shop">Explore the shop <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/categories">Browse categories</Link></Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted">
              <span className="flex items-center gap-2"><Truck className="h-4 w-4" /> Fast delivery</span>
              <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> Verified sellers</span>
              <span className="flex items-center gap-2"><Leaf className="h-4 w-4" /> Curated selection</span>
            </div>
          </div>
          <div className="relative hidden h-[420px] lg:block">
            <div className="absolute inset-0 overflow-hidden rounded-2xl bg-secondary">
              <Image src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85" alt="Curated marketplace collection" fill className="object-cover" priority />
            </div>
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/20 bg-black/55 p-5 text-white backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">The edit</p>
              <p className="mt-1 text-lg font-medium">Everyday objects, elevated.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-marketly py-16">
        {error && <EmptyState title="Could not load the marketplace" description={error} href="/shop" action="Try shop" />}

        {!data && !error && <div className="grid gap-8"><Skeleton className="h-8 w-48" /><Skeleton className="h-44 w-full" /><Skeleton className="h-8 w-48" /><ProductGrid products={[]} loading /></div>}

        {data && (
          <>
            <section>
              <SectionHeading title="Shop by category" subtitle="A shortlist of what we do best." href="/categories" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {data.categories.map((category) => (
                  <Link key={category._id || category.slug} href={`/shop?category=${category.slug}`} className="group overflow-hidden rounded-xl border border-border bg-card">
                    <div className="relative aspect-[4/3] bg-secondary">
                      {category.image && <Image src={category.image} alt={category.name} fill sizes="200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                    </div>
                    <div className="flex items-center justify-between px-3 py-3">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-[11px] text-muted">{category.productCount}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-20">
              <SectionHeading title="Trending now" subtitle="What people are discovering this week." href="/shop?sort=popular" />
              <ProductGrid products={data.trending} />
            </section>

            <section className="mt-20">
              <SectionHeading title="Best sellers" subtitle="Trusted by customers across the marketplace." href="/shop?sort=popular" />
              <ProductGrid products={data.bestSellers} />
            </section>

            {data.offers.length > 0 && (
              <section className="mt-20 rounded-2xl border border-border bg-card p-6 md:p-10">
                <SectionHeading title="Special offers" subtitle="Good design, better value — for a limited time." href="/shop?offer=true" />
                <ProductGrid products={data.offers} />
              </section>
            )}

            {data.stores.length > 0 && (
              <section className="mt-20">
                <SectionHeading title="Featured stores" subtitle="Independent makers and curators worth knowing." href="/stores" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {data.stores.map((store) => (
                    <Link key={store.id || store._id} href={`/stores/${store.slug}`} className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {store.logo || store.banner ? <Image src={store.logo || store.banner} alt={store.storeName} fill sizes="80px" className="object-cover" /> : <span className="grid h-full place-items-center text-sm font-semibold">{store.storeName[0]}</span>}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-medium group-hover:text-accent">{store.storeName}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{store.description}</p>
                        <p className="mt-2 text-[11px] text-muted">{store.productCount} products</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {data.featured.length > 0 && (
              <section className="mt-20">
                <SectionHeading title="Handpicked for you" subtitle="A few things we particularly like." href="/shop" />
                <ProductGrid products={data.featured} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
