import { Suspense } from 'react';
import { ProductListing } from '@/features/catalog/product-listing';
import { ProductGrid } from '@/components/store/product-grid';

export const metadata = { title: 'Shop' };

export default function ShopPage() {
  return <Suspense fallback={<div className="container-marketly py-10"><ProductGrid products={[]} loading /></div>}><ProductListing /></Suspense>;
}
