'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle2, XCircle, Clock3, Loader2, ShieldCheck } from 'lucide-react';
import { paymentService } from '@/services';
import { money, shortDate } from '@/lib/format';
import { Button } from '@/components/ui/button';

const viewFor = (status) => ({
  paid: { icon: CheckCircle2, title: 'Payment confirmed', text: 'The backend verified this payment. Thank you!', tone: 'text-emerald-600' },
  failed: { icon: XCircle, title: 'Payment failed', text: 'The payment did not complete. You can retry from your order.', tone: 'text-red-600' },
  cancelled: { icon: Clock3, title: 'Payment cancelled', text: 'No payment was taken. Your order is still waiting.', tone: 'text-amber-600' },
  refunded: { icon: Clock3, title: 'Payment refunded', text: 'This payment was refunded by an administrator.', tone: 'text-muted' },
}[status] || { icon: Clock3, title: 'Payment pending', text: 'We could not confirm a final status yet. Check your order for updates.', tone: 'text-amber-600' });

function Result() {
  const params = useSearchParams();
  const order = params.get('order');
  const transaction = params.get('transaction');
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // The URL is only a hint about which order to look up. Status always comes from the API.
  useEffect(() => {
    if (!order) {
      setError('No order was provided for this result.');
      setLoading(false);
      return;
    }
    paymentService.get(order)
      .then((data) => {
        if (transaction && data.transactionId && data.transactionId !== transaction) {
          throw new Error('This result link does not match the payment on the order.');
        }
        setPayment(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [order, transaction]);

  if (loading) return <div className="container-marketly py-20 text-center text-muted"><Loader2 className="mx-auto h-6 w-6 animate-spin" /> Verifying payment with the server...</div>;

  if (error) {
    return (
      <div className="container-marketly py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
          <h1 className="mt-5 text-2xl font-semibold">Could not verify payment</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Button asChild className="mt-8"><Link href="/dashboard/buyer/orders">View my orders</Link></Button>
        </div>
      </div>
    );
  }

  const config = viewFor(payment?.status);
  const Icon = config.icon;

  return (
    <div className="container-marketly py-20">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
        <Icon className={`mx-auto h-12 w-12 ${config.tone}`} />
        <h1 className="mt-5 text-2xl font-semibold">{config.title}</h1>
        <p className="mt-2 text-sm text-muted">{config.text}</p>

        {payment && (
          <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4 text-left text-sm">
            <div className="flex justify-between"><span className="text-muted">Order</span><span>{payment.orderNumber || order}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted">Amount</span><span>{money(payment.amount)} {payment.currency}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted">Transaction</span><span className="font-mono text-xs">{payment.transactionId || '—'}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted">Verified at</span><span>{shortDate(payment.processedAt || payment.updatedAt)}</span></div>
          </div>
        )}

        {payment?.simulated && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-700"><ShieldCheck className="h-3.5 w-3.5" /> Simulated transaction — no real money moved.</p>
        )}

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
