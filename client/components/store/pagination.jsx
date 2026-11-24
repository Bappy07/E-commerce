'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Pagination({ meta }) {
  const router = useRouter();
  const params = useSearchParams();
  if (!meta || meta.pages <= 1) return null;

  const go = (page) => {
    const next = new URLSearchParams(params.toString());
    next.set('page', String(page));
    router.push(`${window.location.pathname}?${next}`);
  };

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <Button variant="outline" size="icon" disabled={meta.page <= 1} onClick={() => go(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
      <span className="px-3 text-sm text-muted">Page {meta.page} of {meta.pages}</span>
      <Button variant="outline" size="icon" disabled={meta.page >= meta.pages} onClick={() => go(meta.page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
}
