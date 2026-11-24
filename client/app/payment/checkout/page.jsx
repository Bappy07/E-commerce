'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { BadgeCheck, Ban, CreditCard, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '@/services';
import { money, shortDate } from '@/lib/format';
import { Button } from '@/components/ui/button';

function SimulatedCheckout() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing checkout token.');
      setLoading(false);
      return;
    }
    paymentService.mockSession(token)
      .then((data) => { setSession(data); if (data.processed) setError('This checkout session has already been processed.'); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const choose = async (outcome) => {
    setProcessing(outcome);
    try {
      const result = await paymentService.verifyMock({ token, outcome });
      toast.success(result.duplicate ? 'This session was already processed' : 'Payment processed');
      router.push(result.redirectUrl);
    } catch (err) {
      toast.error(err.message);
      setProcessing('');
    }
  };

  if (loading) return <div className="container-marketly py-20 text-center text-muted"><Loader2 className="mx-auto h-6 w-6 animate-spin" /> Loading secure checkout...</div>;

  if (error || !session) {
    return (
      <div className="container-marketly py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-xl font-semibold">Checkout unavailable</h1>
          <p className="mt-2 text-sm text-muted">{error || 'We could not load this checkout session.'}</p>
          <Button asChild className="mt-6"><Link href="/dashboard/buyer/orders">View my orders</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-marketly py-12">
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Simulated payment environment</p>
          <p className="mt-1 text-xs">This is a portfolio demo. No real money is charged and no card details are collected. Choose a scenario below to see how the backend settles each outcome.</p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100"><CreditCard className="h-5 w-5 text-accent" /></div>
            <div>
              <p className="font-semibold">Pay {money(session.amount)}</p>
              <p className="text-xs text-muted">Order {session.orderNumber} · {session.transactionId}</p>
            </div>
          </div>

          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Method</dt><dd className="capitalize">{session.method?.replaceAll('-', ' ') || 'card'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd>{money(session.amount)} {session.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Session expires</dt><dd>{shortDate(session.expiresAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Status</dt><dd className="capitalize">{session.status}</dd></div>
          </dl>

          <div className="mt-7 grid gap-3">
            <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={Boolean(processing)} onClick={() => choose('success')}>
              {processing === 'success' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Complete simulated payment
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" disabled={Boolean(processing)} onClick={() => choose('failure')}>
                {processing === 'failure' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Simulate failure
              </Button>
              <Button variant="outline" disabled={Boolean(processing)} onClick={() => choose('cancel')}>
                {processing === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancel payment
              </Button>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-muted">The backend re-checks the order amount and issues the final status. This page cannot mark an order as paid.</p>
        </div>
      </div>
    </div>
  );
}

export default function SimulatedCheckoutPage() {
  return <Suspense><SimulatedCheckout /></Suspense>;
}
