'use client';

import { EmptyState } from '@/components/store/empty-state';

export default function ErrorPage({ reset }) {
  return <div className="container-marketly py-20"><EmptyState title="Something went wrong" description="We could not load this page. Please try again." /><div className="mx-auto mt-4 max-w-sm text-center"><button onClick={reset} className="text-sm font-medium text-accent hover:underline">Try again</button></div></div>;
}
