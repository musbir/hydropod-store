'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatINR } from '@/lib/pricing';
import type { Order, OrderStatus } from '@/lib/types';

interface AdminProduct {
  sku: string;
  name: string;
  category: string;
  unit: string;
  price_type: 'listed' | 'quote';
  base_price: number;
  effective_price: number;
  offer_percent: number;
  stock_qty: number;
  active: boolean;
  image: string | null;
}

const TOKEN_KEY = 'hydropod.admin.token';

const STATUSES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'packed',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export function AdminDashboard() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [driver, setDriver] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'catalog' | 'orders'>('catalog');
  const [filter, setFilter] = useState('');

  const load = useCallback(async (t: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/products', {
        headers: { 'x-admin-token': t },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load the dashboard.');
      setProducts(body.products);
      setOrders(body.orders);
      setDriver(body.driver);
      setAuthed(true);
      try {
        sessionStorage.setItem(TOKEN_KEY, t);
      } catch {
        /* storage blocked: token stays in memory for this tab */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
      setAuthed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let saved = '';
    try {
      saved = sessionStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      /* ignore */
    }
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, [load]);

  async function patch(sku: string, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ sku, ...body }),
    });
    const out = await res.json();
    if (!res.ok) {
      setError(out.error ?? 'Update failed.');
      return;
    }
    await load(token);
  }

  async function setOrderStatus(id: string, status: OrderStatus) {
    setError(null);
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ status }),
    });
    const out = await res.json();
    if (!res.ok) {
      setError(out.error ?? 'Update failed.');
      return;
    }
    await load(token);
  }

  /* ------------------------------------------------------------- sign in */
  if (!authed) {
    return (
      <div className="shell py-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(token);
          }}
          className="card mx-auto max-w-sm p-6"
        >
          <h1 className="text-lg font-extrabold tracking-tight">
            Merchant dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Enter the admin token to manage stock, prices and orders.
          </p>

          <label className="label mt-5" htmlFor="token">
            Admin token
          </label>
          <input
            id="token"
            type="password"
            className="field"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !token} className="btn-primary mt-4 w-full">
            {busy ? 'Checking…' : 'Sign in'}
          </button>

          <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
            The token is the <code className="rounded bg-ink/5 px-1">ADMIN_TOKEN</code>{' '}
            environment variable on the server. It is kept in this tab&apos;s
            session storage only.
          </p>
        </form>
      </div>
    );
  }

  const shown = products.filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.sku.toLowerCase().includes(filter.toLowerCase()),
  );

  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter((p) => p.price_type === 'listed' && p.stock_qty <= 5);

  /* ----------------------------------------------------------- dashboard */
  return (
    <div className="shell py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Merchant dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Persistence: <span className="font-semibold">{driver}</span>
            {driver === 'json' && ' — edits are not durable on serverless; set DATABASE_URL for production.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(TOKEN_KEY);
            } catch {
              /* ignore */
            }
            setAuthed(false);
            setToken('');
          }}
          className="btn-secondary"
        >
          Sign out
        </button>
      </div>

      {/* ------------------------------------------------------------ stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Products', String(products.length)],
          ['Orders', String(orders.length)],
          ['Order value', formatINR(revenue)],
          ['Low stock (≤5)', String(lowStock.length)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="label">{k}</p>
            <p className="text-2xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-1 border-b border-ink/10">
        {(['catalog', 'orders'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? 'border-aqua-600 text-aqua-700'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------------- catalog */}
      {tab === 'catalog' && (
        <>
          <input
            className="field mt-4 max-w-sm"
            placeholder="Filter by name or SKU…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter products"
          />

          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-ink/10 bg-ink/[.02] text-left">
                <tr>
                  {['Product', 'Price (₹)', 'Offer (%)', 'Stock', 'Live price', 'Visible'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {shown.map((p) => (
                  <tr key={p.sku} className={p.active ? '' : 'opacity-50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="media-box h-10 w-10 shrink-0 border border-ink/10 p-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image ?? '/images/placeholder.svg'} alt="" width={40} height={40} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-ink-faint">
                            {p.sku} · {p.category} · per {p.unit}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {p.price_type === 'quote' ? (
                        <span className="text-xs text-ink-faint">On request</span>
                      ) : (
                        <NumberCell
                          value={p.base_price}
                          onCommit={(v) => patch(p.sku, { price: v })}
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <NumberCell
                        value={p.offer_percent}
                        max={90}
                        onCommit={(v) => patch(p.sku, { offer_percent: v })}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <NumberCell
                        value={p.stock_qty}
                        onCommit={(v) => patch(p.sku, { stock_qty: v })}
                      />
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {p.price_type === 'quote' ? '—' : formatINR(p.effective_price)}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => patch(p.sku, { active: !p.active })}
                        className={`chip border ${
                          p.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-ink/15 bg-ink/5 text-ink-soft'
                        }`}
                      >
                        {p.active ? 'Visible' : 'Hidden'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ----------------------------------------------------------- orders */}
      {tab === 'orders' && (
        <div className="mt-4">
          {orders.length === 0 ? (
            <div className="card p-10 text-center text-sm text-ink-soft">
              No orders yet. Place one through the storefront to see it here.
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-ink/10 bg-ink/[.02] text-left">
                  <tr>
                    {['Order', 'Customer', 'Slot', 'Payment', 'Total', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{o.id}</p>
                        <p className="text-xs text-ink-faint">
                          {new Date(o.created_at).toLocaleString('en-IN')} ·{' '}
                          {o.lines.length} line{o.lines.length === 1 ? '' : 's'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{o.customer.name}</p>
                        <p className="text-xs text-ink-faint">
                          {o.customer.city} {o.customer.pincode}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {o.slot.date}
                        <br />
                        {o.slot.window}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {o.payment_method.toUpperCase()}
                        <br />
                        <span className="text-ink-faint">{o.payment_status}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatINR(o.total)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => setOrderStatus(o.id, e.target.value as OrderStatus)}
                          className="field py-1.5 text-xs"
                          aria-label={`Status for order ${o.id}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Number input that only writes on blur or Enter, so typing is not laggy. */
function NumberCell({
  value,
  max,
  onCommit,
}: {
  value: number;
  max?: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n !== value) onCommit(n);
    else setDraft(String(value));
  };

  return (
    <input
      type="number"
      min={0}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className="field w-24 py-1.5"
    />
  );
}
