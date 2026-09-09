'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartProvider';
import type { Product } from '@/lib/types';

export function AddToCartButton({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const { add, lines, ready } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = lines.find((l) => l.sku === product.sku)?.qty ?? 0;

  // Quote-led systems are sized against a water test, so they route to an
  // enquiry rather than a cart line.
  if (product.price_type === 'quote') {
    return (
      <Link
        href={`/product/${product.sku}#quote`}
        className={compact ? 'btn-secondary w-full' : 'btn-secondary'}
      >
        Request a quote
      </Link>
    );
  }

  if (!product.in_stock) {
    return (
      <button type="button" disabled className={compact ? 'btn-secondary w-full' : 'btn-secondary'}>
        Out of stock
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => {
        add({
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          price: product.effective_price,
          image: product.images[0]?.srcset['400'] ?? null,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className={compact ? 'btn-primary w-full' : 'btn-primary'}
      aria-live="polite"
    >
      {added ? 'Added ✓' : inCart > 0 ? `Add another (${inCart})` : 'Add to cart'}
    </button>
  );
}
