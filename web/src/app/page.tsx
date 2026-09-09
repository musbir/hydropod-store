import Link from 'next/link';
import { Suspense } from 'react';
import { featured, getCategories, getProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { site, distributor } from '@/lib/site';

// Stock and merchant price edits must surface quickly, so this page is
// revalidated every minute rather than hourly. Checkout re-validates stock
// server-side regardless, so a stale tile can never oversell.
export const revalidate = 60;

export default async function HomePage() {
  const products = await getProducts();
  const categories = getCategories();
  const picks = featured(products, 8);

  const listed = products.filter((p) => p.price_type === 'listed');
  const cheapest = Math.min(...listed.map((p) => p.effective_price));

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="border-b border-ink/10 bg-gradient-to-b from-aqua-50 to-sand">
        <div className="shell grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <p className="chip bg-aqua-100 text-aqua-800">
              Authorised {distributor.brand} dealer
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Water that stops
              <br />
              costing you money.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
              Hardness, iron, chlorine, arsenic, fluoride and nitrate — treated
              at the point that suits your building. {products.length} systems
              and consumables from {distributor.brand} by {distributor.parent},
              installed and serviced across Karnataka.
            </p>

            <div className="mt-6 max-w-lg">
              <Suspense fallback={<div className="h-11 rounded-lg bg-white" />}>
                <SearchBar />
              </Suspense>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/catalog" className="btn-primary">
                Browse the catalog
              </Link>
              <Link href="/catalog?category=defender" className="btn-secondary">
                Shop cartridges from {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(cheapest)}
              </Link>
            </div>

            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-ink/10 pt-6">
              {[
                ['50+ yrs', 'Doshion resin expertise'],
                ['3 yr', 'Warranty on systems'],
                ['59+', 'Countries served'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-lg font-extrabold text-aqua-700">{k}</dt>
                  <dd className="text-xs leading-snug text-ink-soft">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {picks.slice(0, 4).map((p) => (
              <Link
                key={p.sku}
                href={`/product/${p.sku}`}
                className="card media-box p-4 transition-shadow hover:shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.images[0].srcset['400'] ?? p.images[0].src}
                  alt={p.images[0].alt}
                  loading="lazy"
                  width={400}
                  height={400}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- categories */}
      <section className="shell py-12">
        <h2 className="text-xl font-extrabold tracking-tight">
          Shop by system
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Two hardware platforms and a media menu — pick by the problem in your
          water, not the product name.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/catalog?category=${c.slug}`}
              className="card flex flex-col p-4 transition-shadow hover:shadow-lg"
            >
              <span className="text-sm font-bold">{c.name}</span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-ink-soft">
                {c.tagline}
              </span>
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-aqua-600">
                {c.product_count} product{c.product_count === 1 ? '' : 's'} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ featured */}
      <section className="shell pb-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Featured products
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              In stock, priced, and ready to ship from Bengaluru.
            </p>
          </div>
          <Link
            href="/catalog"
            className="shrink-0 text-sm font-semibold text-aqua-700 hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {picks.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ trust bar */}
      <section className="border-y border-ink/10 bg-white">
        <div className="shell grid gap-6 py-10 sm:grid-cols-3">
          {[
            ['Free delivery over ₹5,000', 'Flat ₹249 below that, anywhere in Karnataka.'],
            ['Slot-based installation', 'Choose the day and the 3-hour window at checkout.'],
            ['COD, UPI, Paytm, Razorpay', 'Pay the engineer or online — your call.'],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="text-sm font-bold">{t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- attribution */}
      <section className="shell py-10">
        <p className="text-xs leading-relaxed text-ink-faint">
          {site.name} is an authorised reseller. Product specifications,
          descriptions and imagery originate from{' '}
          <a
            href={distributor.site}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline hover:text-aqua-700"
          >
            {distributor.brand}
          </a>
          , a {distributor.parent} brand. See our{' '}
          <Link href="/supplier" className="underline hover:text-aqua-700">
            supplier and compliance notice
          </Link>{' '}
          for licensing, warranty and grievance-officer details.
        </p>
      </section>
    </>
  );
}
