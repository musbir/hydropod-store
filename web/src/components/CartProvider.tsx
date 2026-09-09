'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CartLine } from '@/lib/types';
import { computeTotals, type Totals } from '@/lib/pricing';

const KEY = 'hydropod.cart.v1';

interface CartCtx {
  lines: CartLine[];
  totals: Totals;
  count: number;
  ready: boolean;
  add(line: Omit<CartLine, 'qty'>, qty?: number): void;
  setQty(sku: string, qty: number): void;
  remove(sku: string): void;
  clear(): void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // `ready` gates rendering of cart-dependent UI so the server HTML and the
  // first client paint agree; localStorage is only readable after mount.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* private mode or cleared storage: start empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* quota or blocked storage: cart stays in memory for this session */
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, 'qty'>, qty = 1) => {
    setLines((cur) => {
      const found = cur.find((l) => l.sku === line.sku);
      if (found) {
        return cur.map((l) =>
          l.sku === line.sku ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [...cur, { ...line, qty }];
    });
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setLines((cur) =>
      qty <= 0
        ? cur.filter((l) => l.sku !== sku)
        : cur.map((l) => (l.sku === sku ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback((sku: string) => {
    setLines((cur) => cur.filter((l) => l.sku !== sku));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      totals: computeTotals(lines),
      count: lines.reduce((n, l) => n + l.qty, 0),
      ready,
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, ready, add, setQty, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
