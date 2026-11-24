'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';

const columns = [
  { title: 'Shop', links: [['Shop all', '/shop'], ['Categories', '/categories'], ['Featured stores', '/stores'], ['Wishlist', '/wishlist']] },
  { title: 'Account', links: [['Sign in', '/login'], ['Create account', '/register'], ['Cart', '/cart'], ['Checkout', '/checkout']] },
  { title: 'Company', links: [['About', '/about'], ['Contact', '/contact'], ['Sell on Marketly', '/register'], ['Search', '/search']] },
];

export function Footer() {
  const [email, setEmail] = useState('');

  const subscribe = async (event) => {
    event.preventDefault();
    try {
      await api.post('/catalog/newsletter', { email });
      toast.success('You are on the list. Welcome to MARKETLY.');
      setEmail('');
    } catch (error) { toast.error(error.message); }
  };

  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="container-marketly grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" className="text-2xl font-bold tracking-[-0.06em]">MARKET<span className="text-accent">LY</span></Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">A considered marketplace for independent sellers and thoughtful buyers. Quality objects, honest prices, simple shopping.</p>
          <form onSubmit={subscribe} className="mt-6 flex max-w-sm items-center gap-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <Button type="submit" size="icon" aria-label="Subscribe"><ArrowRight className="h-4 w-4" /></Button>
          </form>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h4 className="mb-4 text-sm font-semibold">{column.title}</h4>
            <div className="grid gap-2.5">
              {column.links.map(([label, href]) => <Link key={label} href={href} className="text-sm text-muted transition-colors hover:text-accent">{label}</Link>)}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-marketly flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MARKETLY. All rights reserved.</p>
          <p>Built for independent commerce.</p>
        </div>
      </div>
    </footer>
  );
}
