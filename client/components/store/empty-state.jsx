import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({ title = 'Nothing here yet', description, href, action = 'Explore shop', icon: Icon = PackageOpen }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-secondary"><Icon className="h-5 w-5 text-muted" /></div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {href && <Button asChild variant="outline" className="mt-5"><Link href={href}>{action}</Link></Button>}
    </div>
  );
}
