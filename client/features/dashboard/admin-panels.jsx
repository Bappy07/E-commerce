'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Activity, BadgeCheck, CircleDollarSign, Package, ShoppingBag, Users } from 'lucide-react';
import { adminService } from '@/services';
import { money, shortDate } from '@/lib/format';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable } from '@/components/dashboard/data-table';
import { RevenueChart } from '@/components/dashboard/chart';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/store/empty-state';

const panelCard = 'rounded-xl border border-border bg-card p-5';

export function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  useEffect(() => {
    adminService.overview().then(setStats).catch(() => {});
    adminService.analytics({ days: 30 }).then(setAnalytics).catch(() => {});
  }, []);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Marketplace revenue" value={money(stats?.revenue || 0)} hint="Paid orders" icon={CircleDollarSign} accent />
        <StatCard label="Commission earned" value={money(stats?.commission || 0)} icon={Activity} />
        <StatCard label="Orders" value={stats?.orders || 0} icon={ShoppingBag} />
        <StatCard label="Buyers / Sellers" value={`${stats?.buyers || 0} / ${stats?.sellers || 0}`} icon={Users} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <RevenueChart data={(analytics?.series || []).map((point) => ({ date: point.date, revenue: point.revenue }))} label="Revenue, last 30 days" />
        <Card className="p-5">
          <h2 className="font-semibold">Needs attention</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Link href="/dashboard/admin/applications" className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-accent"><span>Seller applications</span><span className="font-semibold text-accent">{stats?.pendingApplications || 0}</span></Link>
            <Link href="/dashboard/admin/products?approved=false" className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-accent"><span>Products</span><span className="font-semibold">{stats?.products || 0}</span></Link>
            <Link href="/dashboard/admin/users" className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-accent"><span>Registered users</span><span className="font-semibold">{(stats?.buyers || 0) + (stats?.sellers || 0) + (stats?.admins || 0)}</span></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const load = (params = {}) => adminService.users({ limit: 200, ...params }).then((r) => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const change = async (user, patch) => { try { await adminService.updateUser(user.id, patch); toast.success('User updated'); load(); } catch (e) { toast.error(e.message); } };
  if (!users.length) return <EmptyState title="No users yet" />;
  return (
    <div className="grid gap-4">
      <form onSubmit={(e) => { e.preventDefault(); load({ search: new FormData(e.currentTarget).get('search') }); }} className="flex max-w-sm gap-2"><Input name="search" placeholder="Search name or email" /><Button size="sm" type="submit">Search</Button></form>
      <DataTable rows={users} searchKeys={['name', 'email']} columns={[
        { key: 'name', label: 'User', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted">{row.email}</p></div> },
        { key: 'role', label: 'Role', render: (row) => <Badge status={row.role} /> },
        { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
        { key: 'joined', label: 'Joined', render: (row) => shortDate(row.createdAt || Date.now()) },
        { key: 'roleAction', label: 'Change role', render: (row) => <Select className="h-8 w-28 text-xs" value={row.role} onChange={(e) => change(row, { role: e.target.value })}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="admin">Admin</option></Select> },
        { key: 'statusAction', label: 'Status', render: (row) => <Button variant={row.status === 'suspended' ? 'outline' : 'destructive'} size="sm" onClick={() => change(row, { status: row.status === 'suspended' ? 'active' : 'suspended' })}>{row.status === 'suspended' ? 'Activate' : 'Suspend'}</Button> },
      ]} />
    </div>
  );
}

export function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const load = () => adminService.sellers({ limit: 200 }).then((r) => setSellers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const change = async (row, status) => { try { await adminService.updateSeller(row.id, { status }); toast.success('Seller updated'); load(); } catch (e) { toast.error(e.message); } };
  return <DataTable emptyTitle="No sellers yet" rows={sellers} searchKeys={['storeName']} columns={[
    { key: 'storeName', label: 'Store', render: (row) => <Link className="font-medium hover:text-accent" href={`/stores/${row.slug}`}>{row.storeName}</Link> },
    { key: 'user', label: 'Owner', render: (row) => row.user?.email || '—' },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'orders', label: 'Orders', render: (row) => row.stats?.totalOrders || 0 },
    { key: 'sales', label: 'Sales', render: (row) => money(row.stats?.totalSales || 0) },
    { key: 'action', label: 'Status', render: (row) => <Select className="h-8 w-32 text-xs" value={row.status} onChange={(e) => change(row, e.target.value)}><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></Select> },
  ]} />;
}

export function AdminApplications() {
  const [items, setItems] = useState([]);
  const load = () => adminService.applications().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const decide = async (row, decision) => { try { await adminService.decideApplication(row.id, { decision }); toast.success(`Application ${decision}`); load(); } catch (e) { toast.error(e.message); } };
  const pending = items.filter((item) => item.status === 'pending');
  if (!items.length) return <EmptyState title="No applications yet" description="Seller applications will appear here." />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {!pending.length && <p className="text-sm text-muted">No pending applications. All {items.length} application(s) have been reviewed.</p>}
      {pending.map((item) => (
        <Card key={item.id} className="p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{item.storeName}</h3><p className="text-xs text-muted">{item.user?.name} · {item.user?.email}</p></div><Badge status={item.status} /></div>
          <p className="mt-4 text-sm leading-6 text-muted">{item.application?.message}</p>
          <p className="mt-3 text-xs text-muted">Applied {shortDate(item.application?.submittedAt || Date.now())}</p>
          <div className="mt-5 flex gap-3"><Button size="sm" onClick={() => decide(item, 'approve')}><BadgeCheck className="h-4 w-4" /> Approve</Button><Button size="sm" variant="outline" onClick={() => decide(item, 'reject')}>Reject</Button></div>
        </Card>
      ))}
    </div>
  );
}

export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const load = () => adminService.products({ limit: 200 }).then((r) => setProducts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const patch = async (row, body) => { try { await adminService.updateProduct(row.id, body); toast.success('Product updated'); load(); } catch (e) { toast.error(e.message); } };
  const remove = async (row) => { if (!confirm(`Delete ${row.title}?`)) return; try { await adminService.deleteProduct(row.id); toast.success('Product deleted'); load(); } catch (e) { toast.error(e.message); } };
  return <DataTable emptyTitle="No products yet" rows={products} searchKeys={['title', 'sku']} columns={[
    { key: 'title', label: 'Product', render: (row) => <div><p className="font-medium">{row.title}</p><p className="text-xs text-muted">{row.store?.name || '—'}</p></div> },
    { key: 'price', label: 'Price', render: (row) => money(row.price) },
    { key: 'approved', label: 'Approved', render: (row) => <Button variant="ghost" size="sm" onClick={() => patch(row, { approved: !row.approved })}><Badge status={row.approved ? 'approved' : 'pending'} /></Button> },
    { key: 'featured', label: 'Featured', render: (row) => <Button variant="ghost" size="sm" onClick={() => patch(row, { featured: !row.featured })}>{row.featured ? 'Yes' : 'No'}</Button> },
    { key: 'status', label: 'Status', render: (row) => <Select className="h-8 w-28 text-xs" value={row.status} onChange={(e) => patch(row, { status: e.target.value })}><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></Select> },
    { key: 'delete', label: '', render: (row) => <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(row)}>Delete</Button> },
  ]} />;
}

export function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const load = () => adminService.categories().then(setCategories).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async (event) => { event.preventDefault(); const name = new FormData(event.currentTarget).get('name'); try { await adminService.createCategory({ name, description: '' }); toast.success('Category created'); event.target.reset(); load(); } catch (e) { toast.error(e.message); } };
  const remove = async (row) => { try { await adminService.deleteCategory(row._id); toast.success('Category deleted'); load(); } catch (e) { toast.error(e.message); } };
  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className={`${panelCard} h-fit grid gap-3`}><h2 className="font-semibold">New category</h2><Input name="name" placeholder="Category name" required /><Button type="submit" size="sm">Add category</Button></form>
      <DataTable emptyTitle="No categories yet" rows={categories} searchKeys={['name']} columns={[
        { key: 'name', label: 'Name', render: (row) => <Link className="hover:text-accent" href={`/shop?category=${row.slug}`}>{row.name}</Link> },
        { key: 'slug', label: 'Slug', render: (row) => <span className="text-xs text-muted">/{row.slug}</span> },
        { key: 'active', label: 'Active', render: (row) => <Badge status={row.active ? 'active' : 'draft'} /> },
        { key: 'delete', label: '', render: (row) => <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(row)}>Delete</Button> },
      ]} />
    </div>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const load = () => adminService.orders({ limit: 200 }).then((r) => setOrders(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const change = async (row, status) => { try { await adminService.updateOrder(row.id, { status }); toast.success('Order updated'); load(); } catch (e) { toast.error(e.message); } };
  return <DataTable emptyTitle="No orders yet" rows={orders} searchKeys={['orderNumber']} columns={[
    { key: 'orderNumber', label: 'Order', render: (row) => <Link className="font-medium hover:text-accent" href={`/dashboard/buyer/orders/${row.id}`}>{row.orderNumber}</Link> },
    { key: 'date', label: 'Date', render: (row) => shortDate(row.createdAt) },
    { key: 'items', label: 'Items', render: (row) => row.items.length },
    { key: 'total', label: 'Total', render: (row) => money(row.total) },
    { key: 'paymentStatus', label: 'Payment', render: (row) => <Badge status={row.paymentStatus} /> },
    { key: 'status', label: 'Status', render: (row) => <Select className="h-8 w-32 text-xs" value={row.status} onChange={(e) => change(row, e.target.value)}><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></Select> },
  ]} />;
}

export function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const load = () => adminService.payments().then(setPayments).catch(() => {});
  useEffect(() => { load(); }, []);
  const refund = async (row) => { if (!confirm('Record a refund for this payment?')) return; try { await adminService.refund(row._id, { note: 'Refunded by admin' }); toast.success('Refund recorded'); load(); } catch (e) { toast.error(e.message); } };
  return <DataTable emptyTitle="No payments yet" rows={payments} searchKeys={['transactionId']} columns={[
    { key: 'order', label: 'Order', render: (row) => row.orderId?.orderNumber || '—' },
    { key: 'gateway', label: 'Gateway', render: (row) => row.gateway },
    { key: 'transactionId', label: 'Transaction', render: (row) => <span className="font-mono text-xs">{row.transactionId || '—'}</span> },
    { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'date', label: 'Date', render: (row) => shortDate(row.createdAt) },
    { key: 'refund', label: '', render: (row) => row.status === 'paid' ? <Button variant="ghost" size="sm" onClick={() => refund(row)}>Refund</Button> : '—' },
  ]} />;
}

export function AdminCommissions() {
  const [data, setData] = useState({ rows: [], total: 0 });
  useEffect(() => { adminService.commissions().then(setData).catch(() => {}); }, []);
  return (
    <div className="grid gap-5">
      <StatCard label="Total commission" value={money(data.total)} icon={CircleDollarSign} accent />
      <DataTable emptyTitle="No commissions yet" rows={data.rows} searchKeys={['orderNumber', 'title']} columns={[
        { key: 'orderNumber', label: 'Order' },
        { key: 'date', label: 'Date', render: (row) => shortDate(row.date) },
        { key: 'title', label: 'Product' },
        { key: 'subtotal', label: 'Item total', render: (row) => money(row.subtotal) },
        { key: 'commission', label: 'Commission', render: (row) => money(row.commission) },
        { key: 'sellerEarning', label: 'Seller earning', render: (row) => money(row.sellerEarning) },
      ]} />
    </div>
  );
}

export function AdminAnalytics() {
  const [data, setData] = useState(null);
  useEffect(() => { adminService.analytics({ days: 30 }).then(setData).catch(() => {}); }, []);
  return (
    <div className="grid gap-5">
      <RevenueChart data={data?.series || []} label="Orders and revenue, last 30 days" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold">Top products</h2>{!data?.topProducts?.length && <p className="text-sm text-muted">No data yet.</p>}{data?.topProducts?.map((product) => <div key={product._id} className="flex justify-between border-b border-border py-2 text-sm last:border-0"><Link className="hover:text-accent" href={`/products/${product.slug || ''}`}>{product.title}</Link><span className="text-muted">{product.sold} sold</span></div>)}</Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Top stores</h2>{!data?.topStores?.length && <p className="text-sm text-muted">No data yet.</p>}{data?.topStores?.map((store) => <div key={store._id} className="flex justify-between border-b border-border py-2 text-sm last:border-0"><span>{store.storeName}</span><span className="text-muted">{money(store.stats?.totalSales || 0)}</span></div>)}</Card>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [settings, setSettings] = useState({ commissionPercent: 10, shippingFee: 60, freeShippingOver: 5000, siteName: 'MARKETLY' });
  useEffect(() => { adminService.settings().then((values) => setSettings((current) => ({ ...current, ...values }))).catch(() => {}); }, []);
  const save = async (event) => { event.preventDefault(); const form = Object.fromEntries(new FormData(event.currentTarget)); try { await adminService.updateSettings({ ...form, commissionPercent: Number(form.commissionPercent), shippingFee: Number(form.shippingFee), freeShippingOver: Number(form.freeShippingOver) }); toast.success('Settings saved'); } catch (e) { toast.error(e.message); } };
  return (
    <form onSubmit={save} className={`${panelCard} max-w-xl grid gap-4`}>
      <h2 className="font-semibold">Marketplace configuration</h2>
      <div><label className="mb-1.5 block text-sm font-medium">Site name</label><Input name="siteName" defaultValue={settings.siteName} /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="mb-1.5 block text-sm font-medium">Commission %</label><Input name="commissionPercent" type="number" min="0" max="50" defaultValue={settings.commissionPercent} /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Delivery fee (৳)</label><Input name="shippingFee" type="number" min="0" defaultValue={settings.shippingFee} /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Free delivery over (৳)</label><Input name="freeShippingOver" type="number" min="0" defaultValue={settings.freeShippingOver} /></div>
      </div>
      <p className="text-xs text-muted">Commission is calculated on the server at checkout. Frontend values are never trusted.</p>
      <Button type="submit">Save settings</Button>
    </form>
  );
}
