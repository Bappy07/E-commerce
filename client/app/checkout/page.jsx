'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, CreditCard, Landmark, MapPin, Plus, ShieldCheck } from 'lucide-react';
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

const icons = { cod: Banknote, mock: CreditCard, sslcommerz: Landmark };
const fallbackMethods = [
  { id: 'cod', label: 'Cash on delivery', description: 'Pay cash when your order arrives', available: true, simulated: false },
  { id: 'mock', label: 'Simulated online payment', description: 'Demo checkout — no real money is charged', available: true, simulated: true },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cart, refresh } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState('');
  const [method, setMethod] = useState('mock');
  const [methods, setMethods] = useState(fallbackMethods);
  const [form, setForm] = useState(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return router.push('/login');
    account.addresses().then((items) => {
      setAddresses(items);
      const defaultAddress = items.find((item) => item.isDefault) || items[0];
      setSelected(defaultAddress?._id || '');
      setShowForm(items.length === 0);
    }).catch(() => {});
    paymentService.methods().then((items) => {
      const available = items.filter((item) => item.available);
      setMethods(available);
      if (!available.some((item) => item.id === method)) setMethod(available[0]?.id || 'cod');
    }).catch(() => {});
  }, [user, authLoading]);

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
      if (method === 'mock') {
        const session = await paymentService.initMock({ orderId: order.id, method: 'card' });
        await refresh();
        router.push(session.checkoutUrl);
        return;
      }
      if (method === 'sslcommerz') {
        const { gatewayUrl } = await paymentService.initSsl(order.id);
        window.location.href = gatewayUrl;
        return;
      }
      await refresh();
      toast.success('Order placed — pay cash on delivery');
      router.push(`/dashboard/buyer/orders/${order.id}`);
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
            <h2 className="mb-1 font-semibold">Payment method</h2>
            <p className="mb-4 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> No paid gateway account needed. All online payments here are simulated.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {methods.map((item) => {
                const Icon = icons[item.id] || CreditCard;
                return (
                  <button key={item.id} onClick={() => setMethod(item.id)} className={cn('flex items-start gap-3 rounded-lg border p-4 text-left', method === item.id ? 'border-accent bg-orange-50/50' : 'border-border')}>
                    <Icon className="mt-0.5 h-5 w-5 text-accent" />
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-muted">{item.description}</span>
                      {item.simulated && <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-600">Simulated · no real charge</span>}
                    </span>
                  </button>
                );
              })}
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
            <div className="flex justify-between"><span className="text-muted">Items subtotal</span><span>{money(cart.subtotal)}</span></div>
            <p className="text-xs text-muted">Delivery and final total are confirmed by the server when the order is placed.</p>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={placeOrder} disabled={placing || !cart.items.length || !method}>{placing ? 'Placing order...' : 'Place order'}</Button>
          <Link href="/cart" className="mt-4 block text-center text-xs text-muted hover:text-accent">Back to cart</Link>
        </aside>
      </div>
    </div>
  );
}
