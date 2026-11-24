'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { catalog } from '@/services';
import { Filters } from '@/components/store/filters';
import { ProductGrid } from '@/components/store/product-grid';
import { Pagination } from '@/components/store/pagination';
import { EmptyState } from '@/components/store/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function ProductListing({ searchPage = false }) {
  const params = useSearchParams();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [term, setTerm] = useState(params.get('q') || '');

  const queryString = params.toString();

  useEffect(() => { catalog.categories().then(setCategories).catch(() => {}); }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const query = Object.fromEntries(params.entries());
    if (searchPage && query.q) query.search = query.q;
    catalog.products(query)
      .then((response) => { if (active) { setResult(response); setError(''); } })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [queryString, searchPage]);

  const submitSearch = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (term) next.set('q', term); else next.delete('q');
    router.push(`/search?${next}`);
  };

  return (
    <div className="container-marketly py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{searchPage ? 'Search results' : 'Shop the marketplace'}</h1>
        <p className="mt-2 text-sm text-muted">{searchPage ? `Results for “${params.get('q') || 'all products'}”` : 'Independent sellers, one considered collection.'}</p>
      </div>

      {searchPage && (
        <form onSubmit={submitSearch} className="mb-8 flex gap-2">
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by product, brand or category" className="max-w-xl" />
          <Button type="submit">Search</Button>
        </form>
      )}

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-4"><Filters categories={categories} total={result?.meta?.total || 0} /></aside>
        <div>
          {error && <EmptyState title="Could not load products" description={error} />}
          <ProductGrid products={result?.data || []} loading={loading} />
          {!loading && !error && <Pagination meta={result?.meta} />}
        </div>
      </div>
    </div>
  );
}
