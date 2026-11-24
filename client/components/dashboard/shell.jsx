'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

export const NAV = {
  buyer: [
    ['overview', 'Overview'], ['orders', 'My orders'], ['payments', 'Payments'], ['wishlist', 'Wishlist'], ['addresses', 'Addresses'],
    ['reviews', 'Reviews'], ['sell', 'Become a seller'], ['profile', 'Profile'], ['settings', 'Settings'],
  ],
  seller: [
    ['overview', 'Overview'], ['store', 'My store'], ['products', 'Products'], ['add-product', 'Add product'],
    ['inventory', 'Inventory'], ['orders', 'Orders'], ['earnings', 'Earnings'], ['commissions', 'Commissions'],
    ['payouts', 'Payouts'], ['settings', 'Settings'],
  ],
  admin: [
    ['overview', 'Overview'], ['users', 'Users'], ['sellers', 'Sellers'], ['applications', 'Seller applications'],
    ['products', 'Products'], ['categories', 'Categories'], ['orders', 'Orders'], ['payments', 'Payments'],
    ['finance', 'Finance'], ['payouts', 'Payouts'], ['commissions', 'Commissions'], ['analytics', 'Analytics'], ['settings', 'Settings'],
  ],
};

const TITLES = { overview: 'Overview', orders: 'Orders', payments: 'Payments', wishlist: 'Wishlist', addresses: 'Addresses', reviews: 'Reviews', sell: 'Become a seller', profile: 'Profile', settings: 'Settings', store: 'My store', products: 'Products', 'add-product': 'Add product', inventory: 'Inventory', earnings: 'Earnings', commissions: 'Commissions', payouts: 'Payouts', finance: 'Finance', users: 'Users', sellers: 'Sellers', applications: 'Seller applications', categories: 'Categories', analytics: 'Analytics' };

export function DashboardShell({ role, section, children }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const base = `/dashboard/${role}`;
  const title = TITLES[section] || 'Overview';

  return (
    <div className="container-marketly py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{role} workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block"><p className="text-sm font-medium">{user?.name}</p><Badge status={user?.role}>{user?.role}</Badge></div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-xs font-semibold text-white">{initials(user?.name)}</div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className={cn('h-fit rounded-xl border border-border bg-card p-3 lg:block', open ? 'block' : 'hidden')}>
          <nav className="grid gap-1">
            {NAV[role].map(([key, label]) => (
              <Link key={key} href={`${base}/${key}`} className={cn('rounded-md px-3 py-2 text-sm transition-colors', section === key ? 'bg-foreground font-medium text-white' : 'text-neutral-600 hover:bg-secondary')}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-border pt-4">
            <Link href="/shop" className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-secondary">← Back to shop</Link>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
