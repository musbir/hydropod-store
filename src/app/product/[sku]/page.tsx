import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { allSkus, getProduct, getProducts } from '@/lib/catalog';
import { formatINR } from '@/lib/pricing';
import { Gallery } from '@/components/Gallery';
import { AddToCartButton } from '@/components/AddToCartButton';
import { ProductCard } from '@/components/ProductCard';
import { site, distributor } from '@/lib/site';

// Stock and merchant price edits must surface quickly, so this page is
// revalidated every minute rather than hourly. Checkout re-validates stock
// server-side regardless, so a stale tile can never oversell.
export const revalidate = 60;

export function generateStaticParams() {
  return allSkus().map((sku) => ({ sku }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku } = await params;
  const product = await getProduct(sku);
  if (!product) return { title: 'Product not found' };

  const priceLine =
    product.price_type === 'quote'
      ? 'Price on request'
      : `${formatINR(product.effective_price)} per ${product.unit}`;

  return {
    title: product.name,
    description: `${product.description} ${priceLine}.`.slice(0, 300),
    alternates: { canonical: `/product/${product.sku}` },
    openGraph: {
      title: `${product.name} — ${site.name}`,
      description: product.description,
      images: product.images.slice(0, 1).map((i) => ({
        url: i.src,
        alt: i.alt,
        width: i.width,
        height: i.height,
      })),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const product = await getProduct(sku);
  if (!product) notFound();

  const all = await getProducts();
  const related = all
    .filter((p) => p.category_slug === product.category_slug && p.sku !== product.sku)
    .slice(0, 4);

  const isQuote = product.price_type === 'quote';

  // Product structured data, with the real availability and price.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.description,
    image: product.images.map((i) => `${site.url}${i.src}`),
    brand: { '@type': 'Brand', name: distributor.brand },
    category: product.category,
    ...(isQuote
      ? {}
      : {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: product.effective_price,
            availability: product.in_stock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: site.name },
          },
        }),
  };

  return (
    <div className="shell py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
        <Link href="/" className="hover:text-aqua-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/catalog" className="hover:text-aqua-700">Catalog</Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/catalog?category=${product.category_slug}`}
          className="hover:text-aqua-700"
        >
          {product.category}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-soft">{product.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Gallery images={product.images} name={product.name} />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-aqua-600">
            {product.category}
            {product.source_category ? ` · ${product.source_category}` : ''}
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-1 text-xs text-ink-faint">
            SKU {product.sku} · Brand {distributor.brand}
          </p>

          <p className="mt-4 leading-relaxed text-ink-soft">
            {product.description}
          </p>

          {/* ------------------------------------------------- price + stock */}
          <div className="card mt-6 p-5">
            {isQuote ? (
              <>
                <p className="text-xl font-extrabold">Price on request</p>
                <p className="mt-1 text-sm text-ink-soft">
                  This system is sized against your water-test report, so it is
                  quoted rather than listed.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-extrabold">
                    {formatINR(product.effective_price)}
                  </span>
                  {product.offer_percent > 0 && (
                    <>
                      <span className="text-base text-ink-faint line-through">
                        {formatINR(product.base_price)}
                      </span>
                      <span className="chip bg-amber-500 text-white">
                        {product.offer_percent}% off
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  per {product.unit} · exclusive of 18% GST
                </p>
              </>
            )}

            <p className="mt-3 text-sm font-semibold">
              {isQuote ? (
                <span className="text-aqua-700">Made to order</span>
              ) : product.in_stock ? (
                <span className="text-emerald-700">
                  In stock — {product.stock_qty} available
                </span>
              ) : (
                <span className="text-rose-700">Out of stock</span>
              )}
            </p>

            <div id="quote" className="mt-4 flex flex-wrap gap-3">
              <AddToCartButton product={product} />
              <Link href="/cart" className="btn-secondary">
                View cart
              </Link>
            </div>

            {isQuote && (
              <p className="mt-3 text-xs text-ink-faint">
                Call {site.phone} or email {site.email} with your water-test
                report and daily consumption, and we will size the system.
              </p>
            )}
          </div>

          {/* ---------------------------------------------------- highlights */}
          {product.highlights.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-bold">Key details</h2>
              <ul className="mt-2 space-y-1.5">
                {product.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-ink-soft">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.included.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-bold">What is included</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {product.included.map((i) => (
                  <li key={i} className="chip bg-aqua-50 text-aqua-800">
                    {i}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* --------------------------------------------------- specs + features */}
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {Object.keys(product.specs).length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold tracking-tight">
              Technical specifications
            </h2>
            <dl className="card mt-3 divide-y divide-ink/10">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold">{k}</dt>
                  <dd className="text-sm text-ink-soft">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {product.features.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold tracking-tight">
              Features &amp; benefits
            </h2>
            <ul className="card mt-3 divide-y divide-ink/10">
              {product.features.map((f) => (
                <li key={f} className="flex gap-3 p-4 text-sm text-ink-soft">
                  <span aria-hidden className="text-aqua-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {product.variants.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-extrabold tracking-tight">Options</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <li
                key={v.name}
                className={`chip border ${
                  v.available
                    ? 'border-ink/15 bg-white text-ink'
                    : 'border-ink/10 bg-ink/5 text-ink-faint line-through'
                }`}
              >
                {v.name}
                {!isQuote && v.price > 0 && ` · ${formatINR(v.price)}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-extrabold tracking-tight">
            More in {product.category}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-xs leading-relaxed text-ink-faint">
        Specification and imagery for this product are published by{' '}
        <a
          href={product.source_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline hover:text-aqua-700"
        >
          {distributor.brand}
        </a>
        . Figures are manufacturer statements and are not independently
        verified by {site.name}.
      </p>
    </div>
  );
}
