'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DashboardShell } from '@/components/dashboard/shell';
import { EmptyState } from '@/components/store/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BuyerOverview, BuyerOrders, BuyerOrderDetail, BuyerWishlist, BuyerAddresses,
  BuyerReviews, BuyerProfile, BuyerSellApplication, BuyerSettings,
} from '@/features/dashboard/buyer-panels';
import {
  SellerOverview, SellerStore, SellerProducts, ProductForm, SellerInventory,
  SellerOrders, SellerEarnings, SellerCommissions, SellerSettings,
} from '@/features/dashboard/seller-panels';
import {
  AdminOverview, AdminUsers, AdminSellers, AdminApplications, AdminProducts, AdminCategories,
  AdminOrders, AdminPayments, AdminCommissions, AdminAnalytics, AdminSettings,
} from '@/features/dashboard/admin-panels';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const role = String(params.role || '');
  const [section = 'overview', id] = params.section || [];

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  if (loading) return <div className="container-marketly grid gap-5 py-12"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!user) return null;
  if (!['buyer', 'seller', 'admin'].includes(role)) return <div className="container-marketly py-16"><EmptyState title="Workspace not found" href="/shop" /></div>;
  if (user.role !== role && user.role !== 'admin') return <div className="container-marketly py-16"><EmptyState title="Access denied" description="You do not have access to this workspace." href={`/dashboard/${user.role}`} action="My dashboard" /></div>;

  const panels = {
    buyer: {
      overview: <BuyerOverview />, orders: id ? <BuyerOrderDetail id={id} /> : <BuyerOrders />,
      wishlist: <BuyerWishlist />, addresses: <BuyerAddresses />, reviews: <BuyerReviews />,
      sell: <BuyerSellApplication />, profile: <BuyerProfile />, settings: <BuyerSettings />,
    },
    seller: {
      overview: <SellerOverview />, store: <SellerStore />, products: id ? <ProductForm productId={id} /> : <SellerProducts />,
      'add-product': <ProductForm />, inventory: <SellerInventory />, orders: <SellerOrders />,
      earnings: <SellerEarnings />, commissions: <SellerCommissions />, settings: <SellerSettings />,
    },
    admin: {
      overview: <AdminOverview />, users: <AdminUsers />, sellers: <AdminSellers />, applications: <AdminApplications />,
      products: <AdminProducts />, categories: <AdminCategories />, orders: <AdminOrders />, payments: <AdminPayments />,
      commissions: <AdminCommissions />, analytics: <AdminAnalytics />, settings: <AdminSettings />,
    },
  };

  return (
    <DashboardShell role={role} section={section}>
      {panels[role][section] || <EmptyState title="Section not found" href={`/dashboard/${role}/overview`} action="Back to overview" />}
    </DashboardShell>
  );
}
