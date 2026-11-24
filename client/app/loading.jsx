import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="container-marketly grid gap-6 py-12"><Skeleton className="h-10 w-64" /><Skeleton className="h-72 w-full" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div></div>;
}
