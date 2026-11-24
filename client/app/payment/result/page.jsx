'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Result() {
  const params = useSearchParams();
  const status = params.get('status') || 'cancelled';
  const order = params.get('order');
  const config = {
    success: { icon: CheckCircle2, title: 'Payment confirmed', text: 'Your payment has been verified by the gateway. Thank you.', tone: 'text-emerald-600' },
    failed: { icon: XCircle, title: 'Payment failed', text: 'The payment could not be completed. You can try again from your order.', tone: 'text-red-600' },
    cancelled: { icon: Clock3, title: 'Payment cancelled', text: 'You cancelled the payment. Your order is still waiting for payment.', tone: 'text-amber-600' },
  }[status] || { icon: Clock3, title: 'Payment status unknown', text: 'Check your order for the latest status.', tone: 'text-muted' };
  const Icon = config.icon;

  return (
    <div className="container-marketly py-20">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
        <Icon className={`mx-auto h-12 w-12 ${config.tone}`} />
        <h1 className="mt-5 text-2xl font-semibold">{config.title}</h1>
        <p className="mt-2 text-sm text-muted">{config.text}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild><Link href={order ? `/dashboard/buyer/orders/${order}` : '/dashboard/buyer/orders'}>View order</Link></Button>
          <Button asChild variant="outline"><Link href="/shop">Continue shopping</Link></Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return <Suspense><Result /></Suspense>;
}
