import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStore } from '@/lib/store';
import { formatINR } from '@/lib/pricing';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order confirmation',
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Cash on delivery',
  upi: 'UPI',
  paytm: 'Paytm',
  razorpay: 'Razorpay',
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getStore().getOrder(id);
  if (!order) notFound();

  return (
    <div className="shell py-10">
      <div className="mx-auto max-w-2xl">
        <div className="card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg text-emerald-700"
            >
              ✓
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Thank you — your order is placed
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                Order <span className="font-semibold text-ink">{order.id}</span> ·{' '}
                {new Date(order.created_at).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-ink/10 pt-6 sm:grid-cols-2">
            <div>
              <dt className="label">Status</dt>
              <dd className="text-sm font-semibold">
                {STATUS_LABEL[order.status] ?? order.status}
              </dd>
            </div>
            <div>
              <dt className="label">Payment</dt>
              <dd className="text-sm font-semibold">
                {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
                <span className="ml-2 font-normal text-ink-soft">
                  ({order.payment_status.replace('_', ' ')})
                </span>
              </dd>
            </div>
            <div>
              <dt className="label">Installation slot</dt>
              <dd className="text-sm font-semibold">
                {new Date(order.slot.date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                , {order.slot.window}
              </dd>
            </div>
            <div>
              <dt className="label">Deliver to</dt>
              <dd className="text-sm leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">{order.customer.name}</span>
                <br />
                {order.customer.address}
                <br />
                {order.customer.city}, {order.customer.state} {order.customer.pincode}
                <br />
                {order.customer.phone}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-ink/10 pt-6">
            <h2 className="text-sm font-bold">Items</h2>
            <ul className="mt-3 divide-y divide-ink/10">
              {order.lines.map((l) => (
                <li key={l.sku} className="flex gap-3 py-3">
                  <div className="media-box h-14 w-14 shrink-0 border border-ink/10 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.image ?? '/images/placeholder.svg'} alt="" width={56} height={56} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{l.name}</p>
                    <p className="text-xs text-ink-faint">
                      {l.sku} · {l.qty} × {formatINR(l.price)} per {l.unit}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    {formatINR(l.price * l.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold">{formatINR(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="font-semibold">
                  {order.delivery_fee === 0 ? 'Free' : formatINR(order.delivery_fee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">GST (18%)</dt>
                <dd className="font-semibold">{formatINR(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-extrabold">{formatINR(order.total)}</dd>
              </div>
            </dl>
          </div>

          {order.payment_status === 'pending' && (
            <p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              This order is awaiting payment. In this demo deployment no payment
              gateway credentials are configured, so no money can be collected —
              the order has been recorded and our team will contact you on{' '}
              {order.customer.phone} to complete payment.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 no-print">
            <Link href="/catalog" className="btn-primary">
              Continue shopping
            </Link>
            <Link href="/" className="btn-secondary">
              Back to home
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Questions? Call {site.phone} quoting order {order.id}.
        </p>
      </div>
    </div>
  );
}
