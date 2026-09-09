'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartProvider';
import { formatINR } from '@/lib/pricing';
import type { GatewayConfig } from '@/lib/payments';
import type { SlotDay } from '@/lib/slots';
import type { Customer, PaymentMethod } from '@/lib/types';

const EMPTY: Customer = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'Karnataka',
  pincode: '',
};

export function CheckoutForm({
  gateways,
  slots,
}: {
  gateways: GatewayConfig[];
  slots: SlotDay[];
}) {
  const router = useRouter();
  const { lines, totals, ready, clear } = useCart();

  const [customer, setCustomer] = useState<Customer>(EMPTY);
  const [slotDate, setSlotDate] = useState(slots[0]?.date ?? '');
  const [slotWindow, setSlotWindow] = useState(slots[0]?.windows[0] ?? '');
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Customer) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCustomer((c) => ({ ...c, [k]: e.target.value }));

  if (ready && lines.length === 0) {
    return (
      <div className="card mt-6 p-10 text-center">
        <p className="font-semibold">Your cart is empty.</p>
        <Link href="/catalog" className="btn-primary mt-4">
          Go to catalog
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          customer,
          slot: { date: slotDate, window: slotWindow },
          payment_method: method,
          notes,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not place the order.');
      clear();
      router.push(`/order/${body.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const activeDay = slots.find((s) => s.date === slotDate) ?? slots[0];

  return (
    <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* ------------------------------------------------------ address */}
        <fieldset className="card p-5">
          <legend className="px-1 text-sm font-bold">Delivery address</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" required className="field" value={customer.name} onChange={set('name')} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" required className="field" value={customer.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" pattern="[0-9+ ]{10,15}" placeholder="9876543210" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" required type="email" className="field" value={customer.email} onChange={set('email')} autoComplete="email" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Address</label>
              <input id="address" required className="field" value={customer.address} onChange={set('address')} autoComplete="street-address" placeholder="Flat / house, street, landmark" />
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" required className="field" value={customer.city} onChange={set('city')} autoComplete="address-level2" />
            </div>
            <div>
              <label className="label" htmlFor="state">State</label>
              <input id="state" required className="field" value={customer.state} onChange={set('state')} autoComplete="address-level1" />
            </div>
            <div>
              <label className="label" htmlFor="pincode">PIN code</label>
              <input id="pincode" required className="field" value={customer.pincode} onChange={set('pincode')} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" placeholder="560058" />
            </div>
          </div>
        </fieldset>

        {/* --------------------------------------------------------- slot */}
        <fieldset className="card p-5">
          <legend className="px-1 text-sm font-bold">Installation slot</legend>
          <p className="mt-1 text-xs text-ink-soft">
            An engineer visits to install and commission. Closed Sundays.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {slots.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setSlotDate(d.date)}
                className={`chip border ${
                  slotDate === d.date
                    ? 'border-aqua-400 bg-aqua-50 text-aqua-800'
                    : 'border-ink/15 bg-white text-ink-soft hover:border-ink/30'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(activeDay?.windows ?? []).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setSlotWindow(w)}
                className={`chip border ${
                  slotWindow === w
                    ? 'border-aqua-400 bg-aqua-50 text-aqua-800'
                    : 'border-ink/15 bg-white text-ink-soft hover:border-ink/30'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ------------------------------------------------------ payment */}
        <fieldset className="card p-5">
          <legend className="px-1 text-sm font-bold">Payment method</legend>
          <div className="mt-3 space-y-2">
            {gateways.map((g) => (
              <label
                key={g.method}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                  method === g.method
                    ? 'border-aqua-400 bg-aqua-50'
                    : 'border-ink/15 hover:border-ink/30'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={g.method}
                  checked={method === g.method}
                  onChange={() => setMethod(g.method)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {g.label}
                    {!g.live && (
                      <span className="chip bg-amber-100 text-amber-800">
                        Demo mode
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {g.description}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="notes">Delivery notes (optional)</label>
            <input id="notes" className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, preferred contact time…" />
          </div>
        </fieldset>
      </div>

      {/* -------------------------------------------------------- summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="text-sm font-bold">Order summary</h2>

          <ul className="mt-3 space-y-2 border-b border-ink/10 pb-3">
            {lines.map((l) => (
              <li key={l.sku} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-ink-soft">
                  {l.name} <span className="text-ink-faint">× {l.qty}</span>
                </span>
                <span className="shrink-0 font-semibold">
                  {formatINR(l.price * l.qty)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-2 text-sm">
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

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !ready} className="btn-primary mt-4 w-full">
            {busy ? 'Placing order…' : `Place order · ${formatINR(totals.total)}`}
          </button>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            By placing this order you accept our terms of sale. Listed prices
            are exclusive of GST, which is shown separately above. You will
            receive an order confirmation by email.
          </p>
        </div>
      </aside>
    </form>
  );
}
