import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function SectionHeading({ title, subtitle, href, action = 'View all' }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:text-accent">{action}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>}
    </div>
  );
}
