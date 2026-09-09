'use client';

import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { formatINR, FREE_DELIVERY_ABOVE } from '@/lib/pricing';

export default function CartPage() {
  const { lines, totals, setQty, remove, ready, clear } = useCart();

  if (!ready) {
    return (
      <div className="shell py-16">
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="shell py-16">
        <div className="card mx-auto max-w-md p-10 text-center">
          <h1 className="text-xl font-extrabold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Browse softeners, filtration systems and consumables.
          </p>
          <Link href="/catalog" className="btn-primary mt-5">
            Go to catalog
          </Link>
        </div>
      </div>
    );
  }

  const shortfall = FREE_DELIVERY_ABOVE - totals.subtotal;

  return (
    <div className="shell py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Your cart
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {lines.length} line{lines.length === 1 ? '' : 's'}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <ul className="card divide-y divide-ink/10">
            {lines.map((l) => (
              <li key={l.sku} className="flex gap-4 p-4">
                <div className="media-box h-20 w-20 shrink-0 border border-ink/10 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image ?? '/images/placeholder.svg'} alt="" width={80} height={80} />
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${l.sku}`}
                    className="text-sm font-bold hover:text-aqua-700"
                  >
                    {l.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {l.sku} · {formatINR(l.price)} per {l.unit}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="inline-flex items-center rounded-lg border border-ink/15 bg-white">
                      <button
                        type="button"
                        onClick={() => setQty(l.sku, l.qty - 1)}
                        className="px-3 py-1.5 text-ink-soft hover:text-ink"
                        aria-label={`Decrease quantity of ${l.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">
                        {l.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(l.sku, l.qty + 1)}
                        className="px-3 py-1.5 text-ink-soft hover:text-ink"
                        aria-label={`Increase quantity of ${l.name}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(l.sku)}
                      className="text-xs font-semibold text-ink-faint hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <p className="shrink-0 text-sm font-bold">
                  {formatINR(l.price * l.qty)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between">
            <Link href="/catalog" className="btn-ghost">
              ← Continue shopping
            </Link>
            <button type="button" onClick={clear} className="btn-ghost">
              Clear cart
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------- summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold">{formatINR(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="font-semibold">
                  {totals.delivery_fee === 0 ? 'Free' : formatINR(totals.delivery_fee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">GST (18%)</dt>
                <dd className="font-semibold">{formatINR(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-extrabold">{formatINR(totals.total)}</dd>
              </div>
            </dl>

            {shortfall > 0 && (
              <p className="mt-3 rounded-lg bg-aqua-50 p-3 text-xs text-aqua-800">
                Add {formatINR(shortfall)} more for free delivery.
              </p>
            )}

            <Link href="/checkout" className="btn-primary mt-4 w-full">
              Proceed to checkout
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
