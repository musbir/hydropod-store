import type { CartLine } from './types';

export const CURRENCY = 'INR';

/** GST on water-treatment equipment (HSN 8421) is 18%. */
export const GST_RATE = 0.18;

/** Free delivery above this order value, else a flat fee. */
export const FREE_DELIVERY_ABOVE = 5000;
export const DELIVERY_FEE = 249;

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface Totals {
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
}

/**
 * Listed prices on the source catalog are ex-GST, so tax is added on top of the
 * subtotal and the delivery fee is charged below the free-shipping threshold.
 */
export function computeTotals(lines: CartLine[]): Totals {
  const subtotal = round2(
    lines.reduce((sum, l) => sum + l.price * l.qty, 0),
  );
  const delivery_fee =
    subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const tax = round2(subtotal * GST_RATE);
  return {
    subtotal,
    delivery_fee,
    tax,
    total: round2(subtotal + delivery_fee + tax),
  };
}
