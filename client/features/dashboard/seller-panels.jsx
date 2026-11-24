'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImagePlus, Package, ShoppingBag, Wallet, X } from 'lucide-react';
import { account, catalog, sellerService, uploadService } from '@/services';
import { money, shortDate } from '@/lib/format';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable } from '@/components/dashboard/data-table';
import { RevenueChart } from '@/components/dashboard/chart';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/store/empty-state';

const panelCard = 'rounded-xl border border-border bg-card p-5';

export function SellerOverview() {
  const [store, setStore] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  useEffect(() => {
    sellerService.store().then(setStore).catch(() => {});
    sellerService.earnings().then(setEarnings).catch(() => {});
    sellerService.orders({ limit: 5 }).then((r) => setOrders(r.data)).catch(() => {});
    sellerService.products({ limit: 5 }).then((r) => setProducts(r.data)).catch(() => {});
  }, []);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Store" value={store?.storeName || '—'} hint={store?.status} icon={ShoppingBag} accent />
        <StatCard label="Orders" value={earnings?.orders || 0} icon={Package} />
        <StatCard label="Your earnings" value={money(earnings?.sellerEarning || 0)} icon={Wallet} />
        <StatCard label="Commission" value={money(earnings?.commission || 0)} hint="Platform share" icon={Wallet} />
      </div>
      <RevenueChart data={earnings?.chart || []} label="Earnings, last 30 days" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold">Recent orders</h2><DataTable searchable={false} emptyTitle="No orders yet" rows={orders} columns={[
          { key: 'orderNumber', label: 'Order', render: (row) => <Link className="hover:text-accent" href="/dashboard/seller/orders">{row.orderNumber}</Link> },
          { key: 'total', label: 'Your total', render: (row) => money(row.myTotal) },
          { key: 'status', label: 'Status', render: (row) => <Badge status={row.items[0]?.sellerStatus} /> },
        ]} /></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Products</h2><DataTable searchable={false} emptyTitle="No products yet" rows={products} columns={[
          { key: 'title', label: 'Product', render: (row) => <Link className="line-clamp-1 hover:text-accent" href={`/dashboard/seller/products/${row.id}`}>{row.title}</Link> },
          { key: 'stock', label: 'Stock', render: (row) => row.stock },
          { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
        ]} /></Card>
      </div>
    </div>
  );
}

export function SellerStore() {
  const [store, setStore] = useState(null);
  useEffect(() => { sellerService.store().then(setStore).catch(() => {}); }, []);
  if (!store) return <p className="text-sm text-muted">Loading store...</p>;
  const save = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await sellerService.updateStore({ storeName: data.storeName, description: data.description, contact: { phone: data.phone, email: data.email, address: data.address } }); toast.success('Store updated'); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <form onSubmit={save} className={`${panelCard} max-w-2xl grid gap-4`}>
      <h2 className="font-semibold">Store details</h2>
      <div><label className="mb-1.5 block text-sm font-medium">Store name</label><Input name="storeName" defaultValue={store.storeName} required /></div>
      <div><label className="mb-1.5 block text-sm font-medium">Description</label><Textarea name="description" defaultValue={store.description} /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="mb-1.5 block text-sm font-medium">Email</label><Input name="email" defaultValue={store.contact?.email} /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Phone</label><Input name="phone" defaultValue={store.contact?.phone} /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Address</label><Input name="address" defaultValue={store.contact?.address} /></div>
      </div>
      <Button type="submit">Save store details</Button>
    </form>
  );
}

export function SellerProducts() {
  const [products, setProducts] = useState([]);
  const load = () => sellerService.products({ limit: 100 }).then((r) => setProducts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const remove = async (id) => { if (!confirm('Delete this product?')) return; try { await sellerService.deleteProduct(id); toast.success('Product deleted'); load(); } catch (e) { toast.error(e.message); } };
  return <DataTable emptyTitle="No products yet" rows={products} searchKeys={['title', 'sku']} columns={[
    { key: 'title', label: 'Product', render: (row) => <Link className="font-medium hover:text-accent" href={`/dashboard/seller/products/${row.id}`}>{row.title}</Link> },
    { key: 'price', label: 'Price', render: (row) => money(row.price) },
    { key: 'stock', label: 'Stock', render: (row) => row.stock },
    { key: 'sold', label: 'Sold', render: (row) => row.sold },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'approved', label: 'Approved', render: (row) => <Badge status={row.approved ? 'approved' : 'pending'} /> },
    { key: 'actions', label: '', render: (row) => <div className="flex gap-2"><Link className="text-xs text-accent" href={`/dashboard/seller/products/${row.id}`}>Edit</Link><button className="text-xs text-red-600" onClick={() => remove(row.id)}>Delete</button></div> },
  ]} />;
}

export function ProductForm({ productId }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', categoryId: '', description: '', brand: '', price: '', compareAtPrice: '', stock: 0, sku: '', status: 'active' });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    catalog.categories().then((items) => { setCategories(items); setForm((current) => ({ ...current, categoryId: current.categoryId || items[0]?._id || '' })); }).catch(() => {});
    if (productId) sellerService.product(productId).then((product) => {
      setForm({ ...product, categoryId: product.categoryId?._id || product.categoryId });
      setImages(product.images || []);
      setVariants(product.variants || []);
    }).catch((e) => toast.error(e.message));
  }, [productId]);

  const upload = async () => {
    if (!files.length) return images;
    const uploaded = await uploadService.productImages(files);
    return [...images, ...uploaded];
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const uploadedImages = await upload();
      const payload = {
        ...form,
        price: Number(form.price), compareAtPrice: Number(form.compareAtPrice || 0), stock: Number(form.stock),
        images: uploadedImages.map((image) => ({ url: image.url, publicId: image.publicId })),
        variants: variants.map((variant) => ({ ...variant, price: Number(variant.price), stock: Number(variant.stock) })),
        tags: [],
      };
      if (productId) await sellerService.updateProduct(productId, payload);
      else await sellerService.createProduct(payload);
      toast.success(productId ? 'Product updated' : 'Product created');
      router.push('/dashboard/seller/products');
    } catch (e) { toast.error(e.message); setSaving(false); }
  };

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className={`${panelCard} grid gap-4`}>
        <h2 className="font-semibold">Product details</h2>
        <div><label className="mb-1.5 block text-sm font-medium">Title</label><Input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm font-medium">Category</label><Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Select category</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</Select></div>
          <div><label className="mb-1.5 block text-sm font-medium">Brand</label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
        </div>
        <div><label className="mb-1.5 block text-sm font-medium">Description</label><Textarea className="min-h-32" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Options / variants</label>
          <div className="grid gap-2">{variants.map((variant, index) => (
            <div key={index} className="grid grid-cols-[1fr_100px_90px_auto] gap-2">
              <Input placeholder="Name" value={variant.name} onChange={(e) => { const next = [...variants]; next[index] = { ...next[index], name: e.target.value }; setVariants(next); }} />
              <Input type="number" min="1" placeholder="Price" value={variant.price} onChange={(e) => { const next = [...variants]; next[index] = { ...next[index], price: e.target.value }; setVariants(next); }} />
              <Input type="number" min="0" placeholder="Stock" value={variant.stock} onChange={(e) => { const next = [...variants]; next[index] = { ...next[index], stock: e.target.value }; setVariants(next); }} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setVariants(variants.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
            </div>
          ))}</div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setVariants([...variants, { name: '', price: form.price || 0, stock: 0 }])}>Add option</Button>
        </div>
      </div>
      <div className="grid h-fit gap-5">
        <div className={panelCard}>
          <h2 className="mb-4 font-semibold">Pricing & inventory</h2>
          <div className="grid gap-3">
            <div><label className="mb-1.5 block text-sm font-medium">Price (৳)</label><Input required type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Compare-at price (৳)</label><Input type="number" min="0" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Stock</label><Input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">SKU</label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Status</label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></Select></div>
          </div>
        </div>
        <div className={panelCard}>
          <h2 className="mb-4 font-semibold">Images</h2>
          <div className="grid grid-cols-3 gap-2">{images.map((image, index) => <div key={index} className="relative aspect-square overflow-hidden rounded-md border border-border"><img src={image.url} alt="Product" className="h-full w-full object-cover" /><button type="button" onClick={() => setImages(images.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-white/90 p-1"><X className="h-3 w-3" /></button></div>)}</div>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-xs text-muted hover:border-accent hover:text-accent"><ImagePlus className="h-4 w-4" /> Upload images<input type="file" accept="image/*" multiple hidden onChange={(e) => setFiles([...e.target.files])} /></label>
          {files.length > 0 && <p className="mt-2 text-xs text-muted">{files.length} new image(s) ready to upload</p>}
          <Button type="submit" className="mt-4 w-full" disabled={saving || images.length === 0 && files.length === 0}>{saving ? 'Saving...' : productId ? 'Save changes' : 'Create product'}</Button>
        </div>
      </div>
    </form>
  );
}

export function SellerInventory() {
  const [products, setProducts] = useState([]);
  const load = () => sellerService.products({ limit: 100 }).then((r) => setProducts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async (product, value) => { try { await sellerService.inventory(product.id, { stock: Number(value) }); toast.success('Stock updated'); load(); } catch (e) { toast.error(e.message); } };
  if (!products.length) return <EmptyState title="No inventory yet" description="Add products to start managing stock." href="/dashboard/seller/add-product" action="Add product" />;
  return <DataTable rows={products} searchKeys={['title', 'sku']} columns={[
    { key: 'title', label: 'Product', render: (row) => <Link className="hover:text-accent" href={`/dashboard/seller/products/${row.id}`}>{row.title}</Link> },
    { key: 'stock', label: 'Stock', render: (row) => <form onSubmit={(e) => { e.preventDefault(); save(row, new FormData(e.currentTarget).get('stock')); }} className="flex gap-2"><Input name="stock" type="number" min="0" defaultValue={row.stock} className="h-8 w-20" /><Button size="sm" variant="outline" type="submit">Save</Button></form> },
    { key: 'variants', label: 'Options', render: (row) => row.variants?.length ? row.variants.map((v) => `${v.name}: ${v.stock}`).join(', ') : '—' },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.stock ? 'active' : 'rejected'}>{row.stock ? 'In stock' : 'Out'}</Badge> },
  ]} />;
}

export function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const load = () => sellerService.orders({ limit: 100 }).then((r) => setOrders(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const update = async (orderId, itemId, sellerStatus) => { try { await sellerService.updateOrderItem(orderId, itemId, { sellerStatus }); toast.success('Fulfillment updated'); load(); } catch (e) { toast.error(e.message); } };
  if (!orders.length) return <EmptyState title="No orders yet" description="Orders containing your products will appear here." />;
  return (
    <div className="grid gap-4">
      {orders.map((order) => (
        <Card key={order.id} className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{order.orderNumber}</p><p className="text-xs text-muted">{shortDate(order.createdAt)}</p></div><div className="flex gap-2"><Badge status={order.paymentStatus} /><Badge status={order.status} /></div></div>
          {order.items.map((item, index) => (
            <div key={item._id || index} className="flex flex-wrap items-center gap-4 border-t border-border py-3">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-xs text-muted">Qty {item.quantity} · {money(item.subtotal)} · Earning {money(item.sellerEarning)}</p></div>
              <Select className="w-40" value={item.sellerStatus} onChange={(e) => update(order.id, item._id, e.target.value)}>
                {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
              </Select>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

export function SellerEarnings() {
  const [data, setData] = useState(null);
  useEffect(() => { sellerService.earnings({ days: 30 }).then(setData).catch(() => {}); }, []);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Your earnings" value={money(data?.sellerEarning || 0)} icon={Wallet} accent />
        <StatCard label="Commission paid" value={money(data?.commission || 0)} icon={Package} />
        <StatCard label="Paid orders" value={data?.orders || 0} icon={ShoppingBag} />
      </div>
      <RevenueChart data={data?.chart || []} label="Earnings, last 30 days" />
    </div>
  );
}

export function SellerCommissions() {
  const [rows, setRows] = useState([]);
  useEffect(() => { sellerService.commissions().then(setRows).catch(() => {}); }, []);
  return <DataTable emptyTitle="No commissions yet" rows={rows} searchKeys={['orderNumber', 'title']} columns={[
    { key: 'orderNumber', label: 'Order', render: (row) => row.orderNumber },
    { key: 'date', label: 'Date', render: (row) => shortDate(row.date) },
    { key: 'title', label: 'Product' },
    { key: 'subtotal', label: 'Item total', render: (row) => money(row.subtotal) },
    { key: 'commission', label: 'Commission', render: (row) => money(row.commission) },
    { key: 'sellerEarning', label: 'Your earning', render: (row) => money(row.sellerEarning) },
  ]} />;
}

export function SellerSettings() {
  const [store, setStore] = useState(null);
  useEffect(() => { sellerService.store().then(setStore).catch(() => {}); }, []);
  return (
    <Card className="max-w-xl p-5">
      <h2 className="font-semibold">Store settings</h2>
      <p className="mt-2 text-sm text-muted">Your store slug: <span className="font-medium text-foreground">/{store?.slug || '—'}</span></p>
      <p className="mt-2 text-sm text-muted">Status: <Badge status={store?.status} /></p>
      <Button asChild variant="outline" className="mt-5"><Link href="/dashboard/seller/store">Edit store details</Link></Button>
    </Card>
  );
}
