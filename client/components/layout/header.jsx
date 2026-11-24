'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, UserRound, X, LayoutDashboard, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { cn } from '@/lib/utils';

const links = [
  { href: '/shop', label: 'Shop' },
  { href: '/categories', label: 'Categories' },
  { href: '/stores', label: 'Stores' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { items } = useWishlist();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [pathname]);

  const search = (event) => {
    event.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const dashboard = user?.role === 'admin' ? '/dashboard/admin' : user?.role === 'seller' ? '/dashboard/seller' : '/dashboard/buyer';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-marketly flex h-16 items-center gap-6">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-[-0.06em]">
          MARKET<span className="text-accent">LY</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={cn('text-sm transition-colors hover:text-accent', pathname === link.href ? 'font-medium text-accent' : 'text-neutral-600')}>
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={search} className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 md:flex">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." aria-label="Search products" className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Wishlist">
            <Link href="/wishlist"><Heart className="h-[18px] w-[18px]" />{items.length > 0 && <span className="absolute mt-[-20px] ml-[18px] rounded-full bg-accent px-1 text-[9px] text-white">{items.length}</span>}</Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Cart">
            <Link href="/cart"><ShoppingBag className="h-[18px] w-[18px]" />{cart.count > 0 && <span className="absolute mt-[-20px] ml-[18px] rounded-full bg-accent px-1 text-[9px] text-white">{cart.count}</span>}</Link>
          </Button>

          {user ? (
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setAccountOpen((open) => !open)} aria-label="Account menu"><UserRound className="h-[18px] w-[18px]" /></Button>
              {accountOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-lg border border-border bg-card p-1.5 shadow-xl fade-in">
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary" href={dashboard}><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                  <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary" href="/dashboard/buyer/orders"><ShoppingBag className="h-4 w-4" /> My orders</Link>
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-secondary" onClick={async () => { await logout(); toast.success('Signed out'); router.push('/'); }}><LogOut className="h-4 w-4" /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link href="/login">Sign in</Link></Button>
          )}

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-card px-5 py-4 lg:hidden fade-in">
          <form onSubmit={search} className="mb-3 flex items-center gap-2 rounded-md border border-input bg-background px-3 md:hidden">
            <Search className="h-4 w-4 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." className="h-10 w-full bg-transparent text-sm outline-none" />
          </form>
          <div className="grid gap-1">
            {links.map((link) => <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">{link.label}</Link>)}
            {!user && <Button asChild className="mt-2"><Link href="/login">Sign in</Link></Button>}
          </div>
        </div>
      )}
    </header>
  );
}
