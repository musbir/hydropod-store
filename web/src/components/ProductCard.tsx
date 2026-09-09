import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { formatINR } from '@/lib/pricing';
import { AddToCartButton } from './AddToCartButton';

export function ProductCard({ product }: { product: Product }) {
  const img = product.images[0];
  const isQuote = product.price_type === 'quote';
  const discounted = product.offer_percent > 0;

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link
        href={`/product/${product.sku}`}
        className="media-box border-b border-ink/5 p-4"
      >
        <Image
          src={img.srcset['400'] ?? img.src}
          alt={img.alt}
          width={400}
          height={400}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
          className="transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {discounted && (
          <span className="chip absolute left-3 top-3 bg-amber-500 text-white">
            {product.offer_percent}% off
          </span>
        )}
        {!product.in_stock && !isQuote && (
          <span className="chip absolute right-3 top-3 bg-ink/80 text-white">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-aqua-600">
          {product.category}
        </p>
        <h3 className="mt-1 text-sm font-bold leading-snug">
          <Link href={`/product/${product.sku}`} className="hover:text-aqua-700">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
          {product.description}
        </p>

        <div className="mt-3 flex items-end justify-between gap-2 pt-1">
          <div>
            {isQuote ? (
              <p className="text-sm font-bold text-ink-soft">Price on request</p>
            ) : (
              <>
                <p className="text-base font-bold">
                  {formatINR(product.effective_price)}
                </p>
                <p className="text-[11px] text-ink-faint">
                  {discounted && (
                    <span className="mr-1 line-through">
                      {formatINR(product.base_price)}
                    </span>
                  )}
                  per {product.unit}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <AddToCartButton product={product} compact />
        </div>
      </div>
    </article>
  );
}
