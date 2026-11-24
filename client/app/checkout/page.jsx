'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, CreditCard, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { account, cartService, orderService, paymentService } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { money } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/store/empty-state';
import { cn } from '@/lib/utils';

const emptyAddress = { label: 'Home', name: '', phone: '', line1: '', line2: '', city: 'Dhaka', district: 'Dhaka', postalCode: '', country: 'Bangladesh', isDefault: true };

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cart, refresh } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState('');
  const [method, setMethod] = useState('cod');
  const [form, setForm] = useState(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [totals, setTotals] = useState({ shipping: 60, total: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return router.push('/login');
    account.addresses().then((items) => {
      setAddresses(items);
      const defaultAddress = items.find((item) => item.isDefault) || items[0];
      setSelected(defaultAddress?._id || '');
      setShowForm(items.length === 0);
    }).catch(() => {});
  }, [user, authLoading]);

  useEffect(() => { setTotals({ shipping: cart.subtotal >= 5000 ? 0 : 60, total: cart.subtotal + (cart.subtotal >= 5000 ? 0 : 60) }); }, [cart.subtotal]);

  const saveAddress = async (event) => {
    event.preventDefault();
    try {
      const created = await account.addAddress(form);
      setAddresses((items) => [...items, created]);
      setSelected(created._id);
      setShowForm(false);
      toast.success('Address saved');
    } catch (error) { toast.error(error.message); }
  };

  const placeOrder = async () => {
    if (!selected) return toast.error('Please select or add a delivery address');
    setPlacing(true);
    try {
      const order = await orderService.create({ addressId: selected, paymentMethod: method });
      if (method === 'sslcommerz') {
        const { gatewayUrl } = await paymentService.init(order.id);
        window.location.href = gatewayUrl;
      } else {
        await refresh();
        toast.success('Order placed successfully');
        router.push(`/dashboard/buyer/orders/${order.id}`);
      }
    } catch (error) {
      toast.error(error.message);
      setPlacing(false);
    }
  };

  if (!cart.items.length) return <div className="container-marketly py-12"><EmptyState title="Nothing to check out" description="Your cart is empty." href="/shop" action="Browse products" /></div>;

  return (
    <div className="container-marketly py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-8">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-accent" /> Delivery address</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm((value) => !value)}><Plus className="h-3.5 w-3.5" /> New address</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => (
                <button key={address._id} onClick={() => setSelected(address._id)} className={cn('rounded-lg border p-4 text-left text-sm transition-colors', selected === address._id ? 'border-accent bg-orange-50/50' : 'border-border hover:border-neutral-400')}>
                  <p className="font-medium">{address.label} · {address.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{address.line1}, {address.city}, {address.country}</p>
                  <p className="text-xs text-muted">{address.phone}</p>
                </button>
              ))}
            </div>
            {showForm && (
              <form onSubmit={saveAddress} className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
                {[['name', 'Full name'], ['phone', 'Phone'], ['line1', 'Address line 1'], ['line2', 'Address line 2'], ['city', 'City'], ['district', 'District'], ['postalCode', 'Postal code']].map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
                    <Input required={['name', 'phone', 'line1', 'city'].includes(key)} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  </div>
                ))}
                <div className="sm:col-span-2"><Button type="submit" size="sm">Save address</Button></div>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Payment method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => setMethod('cod')} className={cn('flex items-start gap-3 rounded-lg border p-4 text-left', method === 'cod' ? 'border-accent bg-orange-50/50' : 'border-border')}>
                <Banknote className="mt-0.5 h-5 w-5 text-accent" />
                <span><span className="block text-sm font-medium">Cash on delivery</span><span className="text-xs text-muted">Pay when your order arrives</span></span>
              </button>
              <button onClick={() => setMethod('sslcommerz')} className={cn('flex items-start gap-3 rounded-lg border p-4 text-left', method === 'sslcommerz' ? 'border-accent bg-orange-50/50' : 'border-border')}>
                <CreditCard className="mt-0.5 h-5 w-5 text-accent" />
                <span><span className="block text-sm font-medium">Online payment</span><span className="text-xs text-muted">Card, mobile banking via SSLCommerz</span></span>
              </button>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Your order</h2>
          <div className="mt-4 grid gap-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {item.product.images?.[0]?.url && <Image src={item.product.images[0].url} alt={item.product.title} fill sizes="48px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{item.product.title}</p><p className="text-xs text-muted">Qty {item.quantity}</p></div>
                <span className="text-xs">{money(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(cart.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Delivery</span><span>{totals.shipping ? money(totals.shipping) : 'Free'}</span></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>Total</span><span>{money(totals.total)}</span></div>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={placeOrder} disabled={placing || !cart.items.length}>{placing ? 'Placing order...' : 'Place order'}</Button>
          <Link href="/cart" className="mt-4 block text-center text-xs text-muted hover:text-accent">Back to cart</Link>
        </aside>
      </div>
    </div>
  );
}
