'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { catalog } from '@/services';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { catalog.categories().then(setCategories).catch(() => setCategories([])).finally(() => setLoading(false)); }, []);

  return (
    <div className="container-marketly py-12">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Categories</h1>
      <p className="mt-2 text-sm text-muted">Find exactly what you came for.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        {!loading && categories.map((category) => (
          <Link key={category._id} href={`/shop?category=${category.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative h-44 bg-secondary">
              {category.image && <Image src={category.image} alt={category.name} fill sizes="400px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <h2 className="absolute bottom-4 left-5 text-xl font-semibold text-white">{category.name}</h2>
            </div>
            <div className="flex items-center justify-between p-5">
              <p className="text-sm text-muted">{category.description}</p>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
