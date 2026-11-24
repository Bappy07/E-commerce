'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function Filters({ categories = [], total = 0 }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    router.push(`${window.location.pathname}?${next.toString()}`);
  };

  const active = ['category', 'minPrice', 'maxPrice', 'sort', 'offer', 'q'].filter((key) => params.get(key));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted"><SlidersHorizontal className="h-4 w-4" /> {total} products</div>
        <div className="flex items-center gap-2">
          {active.length > 0 && <Button variant="ghost" size="sm" onClick={() => router.push(window.location.pathname)}><X className="h-3.5 w-3.5" /> Clear</Button>}
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen((value) => !value)}>Filters</Button>
        </div>
      </div>

      <div className={cn('grid gap-6 lg:block', open ? '' : 'hidden lg:block')}>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Category</p>
          <div className="grid gap-1">
            <button onClick={() => setParam('category', '')} className={cn('rounded-md px-2 py-2 text-left text-sm hover:bg-secondary', !params.get('category') && 'font-medium text-accent')}>All categories</button>
            {categories.map((category) => (
              <button key={category.slug || category._id} onClick={() => setParam('category', category.slug)} className={cn('rounded-md px-2 py-2 text-left text-sm hover:bg-secondary', params.get('category') === category.slug && 'font-medium text-accent')}>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Price range (৳)</p>
          <div className="flex items-center gap-2">
            <Input type="number" min="0" placeholder="Min" defaultValue={params.get('minPrice') || ''} onBlur={(e) => setParam('minPrice', e.target.value)} />
            <Input type="number" min="0" placeholder="Max" defaultValue={params.get('maxPrice') || ''} onBlur={(e) => setParam('maxPrice', e.target.value)} />
          </div>
        </div>

        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Sort by</p>
          <Select value={params.get('sort') || 'newest'} onChange={(e) => setParam('sort', e.target.value)}>
            <option value="newest">Newest</option>
            <option value="popular">Most popular</option>
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </Select>
        </div>

        <label className="mt-8 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={params.get('offer') === 'true'} onChange={(e) => setParam('offer', e.target.checked ? 'true' : '')} className="h-4 w-4 accent-orange-500" />
          On offer only
        </label>
      </div>
    </div>
  );
}
