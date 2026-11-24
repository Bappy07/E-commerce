'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, CreditCard, Heart, MapPin, Package, ShoppingBag, Wallet } from 'lucide-react';
import { account, orderService, paymentService } from '@/services';
import { money, shortDate } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useWishlist } from '@/hooks/use-wishlist';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable } from '@/components/dashboard/data-table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/store/empty-state';
import { ProductGrid } from '@/components/store/product-grid';

const panelCard = 'rounded-xl border border-border bg-card p-5';

export function BuyerOverview() {
  const { items } = useWishlist();
  const [orders, setOrders] = useState([]);
  useEffect(() => { orderService.mine({ limit: 5 }).then((r) => setOrders(r.data)).catch(() => {}); }, []);
  const spent = orders.filter((order) => order.paymentStatus === 'paid').reduce((sum, order) => sum + order.total, 0);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total orders" value={orders.length} icon={ShoppingBag} accent />
        <StatCard label="Saved items" value={items.length} icon={Heart} />
        <StatCard label="Recent spend" value={money(spent)} icon={Package} />
      </div>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recent orders</h2><Link href="/dashboard/buyer/orders" className="text-xs text-accent hover:underline">View all</Link></div>
        <DataTable
          searchable={false}
          emptyTitle="No orders yet"
          columns={[
            { key: 'orderNumber', label: 'Order', render: (row) => <Link className="font-medium hover:text-accent" href={`/dashboard/buyer/orders/${row.id}`}>{row.orderNumber}</Link> },
            { key: 'createdAt', label: 'Date', render: (row) => shortDate(row.createdAt) },
            { key: 'total', label: 'Total', render: (row) => money(row.total) },
            { key: 'paymentStatus', label: 'Payment', render: (row) => <Badge status={row.paymentStatus} /> },
            { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
          ]}
          rows={orders}
        />
      </Card>
    </div>
  );
}

export function BuyerOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  useEffect(() => { orderService.mine({ limit: 100, status }).then((r) => setOrders(r.data)).catch(() => {}); }, [status]);
  return (
    <div className="grid gap-5">
      <div className="flex justify-end"><Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48"><option value="">All statuses</option>{['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((item) => <option key={item} value={item}>{item}</option>)}</Select></div>
      <DataTable
        rows={orders} searchKeys={['orderNumber']}
        columns={[
          { key: 'orderNumber', label: 'Order', render: (row) => <Link className="font-medium hover:text-accent" href={`/dashboard/buyer/orders/${row.id}`}>{row.orderNumber}</Link> },
          { key: 'createdAt', label: 'Placed', render: (row) => shortDate(row.createdAt) },
          { key: 'items', label: 'Items', render: (row) => row.items.length },
          { key: 'total', label: 'Total', render: (row) => money(row.total) },
          { key: 'paymentStatus', label: 'Payment', render: (row) => <Badge status={row.paymentStatus} /> },
          { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
          { key: 'action', label: '', render: (row) => <Link href={`/dashboard/buyer/orders/${row.id}`} className="text-xs text-accent hover:underline">Details</Link> },
        ]}
      />
    </div>
  );
}

export function BuyerOrderDetail({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => orderService.get(id).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const cancel = async () => {
    try { await orderService.cancel(id); toast.success('Order cancelled'); load(); }
    catch (e) { toast.error(e.message); }
  };
  const pay = async () => {
    try {
      if (order.paymentMethod === 'mock') {
        const session = await paymentService.initMock({ orderId: id, method: 'card' });
        router.push(session.checkoutUrl);
      } else {
        const { gatewayUrl } = await paymentService.initSsl(id);
        window.location.href = gatewayUrl;
      }
    } catch (e) { toast.error(e.message); }
  };

  if (error) return <EmptyState title="Order unavailable" description={error} href="/dashboard/buyer/orders" />;
  if (!data) return <p className="text-sm text-muted">Loading order...</p>;
  const { order, payment } = data;
  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs text-muted">Order number</p><h2 className="mt-1 text-xl font-semibold">{order.orderNumber}</h2><p className="mt-1 text-xs text-muted">Placed {shortDate(order.createdAt)}</p></div>
          <div className="flex gap-2"><Badge status={order.status} /><Badge status={order.paymentStatus} /></div>
        </div>
        <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <div><p className="text-xs text-muted">Delivery address</p><p className="mt-1 text-sm">{order.address.name} · {order.address.phone}</p><p className="text-sm text-muted">{order.address.line1}, {order.address.city}</p></div>
          <div>
            <p className="text-xs text-muted">Payment</p>
            <p className="mt-1 text-sm capitalize">{order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod === 'mock' ? 'Simulated online payment' : 'SSLCommerz'}</p>
            {payment?.transactionId && <p className="text-xs text-muted">{payment.transactionId}</p>}
            {payment?.simulated && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">Simulated · no real money</p>}
            {order.paymentMethod === 'cod' && <p className="mt-1 text-xs text-amber-700">{order.delivery?.paymentCollected ? `Cash collected ${shortDate(order.delivery.collectedAt)}` : 'Cash not collected yet'}</p>}
          </div>
        </div>
        {['pending', 'processing'].includes(order.status) && ['pending', 'failed', 'cancelled'].includes(order.paymentStatus) && (
          <div className="mt-5 flex gap-3 border-t border-border pt-5">
            {order.paymentMethod !== 'cod' && <Button onClick={pay}>Complete payment</Button>}
            <Button variant="outline" onClick={cancel}>Cancel order</Button>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">Items</h3>
        <div className="grid gap-3">
          {order.items.map((item, index) => (
            <div key={item._id || index} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
              <div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted">{item.variantName ? `${item.variantName} · ` : ''}Qty {item.quantity} · {money(item.unitPrice)}</p></div>
              <div className="text-right"><p className="text-sm font-medium">{money(item.subtotal)}</p>{item.reviewed && <Badge tone="success">Reviewed</Badge>}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Delivery</span><span>{order.shipping ? money(order.shipping) : 'Free'}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{money(order.total)}</span></div>
        </div>
      </Card>
      <Card className="p-5"><h3 className="mb-4 font-semibold">Tracking</h3><div className="grid gap-3">{order.timeline.map((entry, index) => <div key={index} className="flex items-center gap-3 text-sm"><span className="h-2 w-2 rounded-full bg-accent" /><span>{entry.label}</span><span className="ml-auto text-xs text-muted">{shortDate(entry.at)}</span></div>)}</div></Card>
    </div>
  );
}

export function BuyerWishlist() {
  const { items } = useWishlist();
  return <ProductGrid products={items} />;
}

export function BuyerAddresses() {
  const [addresses, setAddresses] = useState([]);
  const load = () => account.addresses().then(setAddresses).catch(() => {});
  useEffect(() => { load(); }, []);
  const remove = async (id) => { try { await account.deleteAddress(id); toast.success('Address removed'); load(); } catch (e) { toast.error(e.message); } };
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-3">
        {!addresses.length && <EmptyState title="No saved addresses" description="Add an address to check out faster." icon={MapPin} />}
        {addresses.map((address) => (
          <Card key={address._id} className="flex items-start justify-between gap-4 p-5">
            <div><p className="font-medium">{address.label} {address.isDefault && <Badge tone="success">Default</Badge>}</p><p className="mt-2 text-sm">{address.name} · {address.phone}</p><p className="text-sm text-muted">{address.line1}, {address.line2} {address.city}, {address.country}</p></div>
            <Button variant="ghost" size="sm" onClick={() => remove(address._id)}>Remove</Button>
          </Card>
        ))}
      </div>
      <form onSubmit={async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); try { await account.addAddress({ ...data, isDefault: addresses.length === 0 }); toast.success('Address saved'); event.target.reset(); load(); } catch (e) { toast.error(e.message); } }} className={panelCard + ' h-fit grid gap-3'}>
        <h2 className="font-semibold">Add address</h2>
        {[['label', 'Label'], ['name', 'Full name'], ['phone', 'Phone'], ['line1', 'Address line'], ['city', 'City'], ['postalCode', 'Postal code']].map(([key, label]) => <div key={key}><label className="mb-1 block text-xs text-muted">{label}</label><Input name={key} required={['name', 'phone', 'line1', 'city'].includes(key)} defaultValue={key === 'label' ? 'Home' : key === 'city' ? 'Dhaka' : ''} /></div>)}
        <Button type="submit" size="sm">Save address</Button>
      </form>
    </div>
  );
}

export function BuyerReviews() {
  const [reviews, setReviews] = useState([]);
  const load = () => account.reviews().then(setReviews).catch(() => {});
  useEffect(() => { load(); }, []);
  const remove = async (id) => { try { await account.deleteReview(id); toast.success('Review removed'); load(); } catch (e) { toast.error(e.message); } };
  return <DataTable emptyTitle="No reviews yet" rows={reviews} searchKeys={['comment']} columns={[
    { key: 'product', label: 'Product', render: (row) => <Link className="hover:text-accent" href={`/products/${row.productId?.slug}`}>{row.productId?.title || 'Product'}</Link> },
    { key: 'rating', label: 'Rating', render: (row) => `${row.rating}/5` },
    { key: 'comment', label: 'Comment', render: (row) => <span className="line-clamp-1">{row.comment}</span> },
    { key: 'action', label: '', render: (row) => <Button variant="ghost" size="sm" onClick={() => remove(row._id)}>Delete</Button> },
  ]} />;
}

const profileSchema = z.object({ name: z.string().min(2), phone: z.string().optional(), image: z.string().optional() });

export function BuyerProfile() {
  const { user, refresh } = useAuth();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ resolver: zodResolver(profileSchema) });
  useEffect(() => { if (user) reset({ name: user.name, phone: user.phone || '', image: user.image || '' }); }, [user]);
  const save = async (values) => { try { await account.update(values); await refresh(); toast.success('Profile updated'); } catch (e) { toast.error(e.message); } };
  return (
    <form onSubmit={handleSubmit(save)} className={`${panelCard} max-w-xl grid gap-4`}>
      <h2 className="font-semibold">Personal details</h2>
      <div><label className="mb-1.5 block text-sm font-medium">Name</label><Input {...register('name')} /></div>
      <div><label className="mb-1.5 block text-sm font-medium">Phone</label><Input {...register('phone')} /></div>
      <div><label className="mb-1.5 block text-sm font-medium">Profile image URL</label><Input {...register('image')} placeholder="https://..." /></div>
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save changes'}</Button>
    </form>
  );
}

export function BuyerSellApplication() {
  const [application, setApplication] = useState(null);
  useEffect(() => { account.myApplication().then(setApplication).catch(() => {}); }, []);
  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { setApplication(await account.applySeller(data)); toast.success('Application submitted'); }
    catch (e) { toast.error(e.message); }
  };
  if (application) return <Card className="max-w-xl p-6"><h2 className="font-semibold">Application {application.status}</h2><p className="mt-2 text-sm text-muted">Store: {application.storeName}. Our team will review your application and notify you.</p><Badge status={application.status} className="mt-4" /></Card>;
  return (
    <form onSubmit={submit} className={`${panelCard} max-w-xl grid gap-4`}>
      <h2 className="font-semibold">Open your store</h2>
      <p className="text-sm text-muted">Tell us about your store. Approval is required before you can list products.</p>
      <div><label className="mb-1.5 block text-sm font-medium">Store name</label><Input name="storeName" required minLength={2} /></div>
      <div><label className="mb-1.5 block text-sm font-medium">Phone</label><Input name="phone" required minLength={6} /></div>
      <div><label className="mb-1.5 block text-sm font-medium">About your store</label><Textarea name="message" required minLength={10} /></div>
      <Button type="submit">Submit application</Button>
    </form>
  );
}

export function BuyerPayments() {
  const [result, setResult] = useState({ data: [], meta: {} });
  const load = () => paymentService.history({ limit: 100 }).then(setResult).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Transparent payment history</p>
        <p className="mt-1 text-xs">Rows labelled “simulated” were created in this portfolio demo. No real funds were transferred.</p>
      </div>
      <DataTable
        emptyTitle="No payments yet"
        rows={result.data}
        searchKeys={['transactionId']}
        columns={[
          { key: 'date', label: 'Date', render: (row) => shortDate(row.createdAt) },
          { key: 'order', label: 'Order', render: (row) => row.orderId?.orderNumber || '—' },
          { key: 'gateway', label: 'Method', render: (row) => <span className="capitalize">{row.gateway === 'mock' ? 'Simulated' : row.gateway === 'cod' ? 'Cash on delivery' : row.gateway}</span> },
          { key: 'transactionId', label: 'Transaction', render: (row) => <span className="font-mono text-xs">{row.transactionId || '—'}</span> },
          { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
          { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
          { key: 'mode', label: 'Type', render: (row) => row.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="neutral">{row.mode}</Badge> },
        ]}
      />
    </div>
  );
}

export function BuyerSettings() {
  const [notifications, setNotifications] = useState([]);
  const load = () => account.notifications({ limit: 20 }).then((r) => setNotifications(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const markRead = async () => { try { await account.readNotifications(); toast.success('All caught up'); load(); } catch (e) { toast.error(e.message); } };
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-accent" /> Notifications</h2><Button variant="ghost" size="sm" onClick={markRead}>Mark all read</Button></div>
      {!notifications.length && <EmptyState title="No notifications" description="Order and account updates will appear here." icon={Bell} />}
      <div className="grid gap-3">{notifications.map((item) => <Link key={item._id} href={item.link || '#'} className="rounded-lg border border-border p-4 hover:border-accent"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted">{item.body}</p></Link>)}</div>
    </Card>
  );
}
