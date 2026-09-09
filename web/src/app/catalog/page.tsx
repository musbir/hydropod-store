import Link from 'next/link';
import type { Metadata } from 'next';
import {
  byShopworthiness,
  getCategories,
  getProducts,
  searchProducts,
} from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

// Stock and merchant price edits must surface quickly, so this page is
// revalidated every minute rather than hourly. Checkout re-validates stock
// server-side regardless, so a stale tile can never oversell.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Catalog',
  description:
    'Every water softener, filtration system, DM cartridge, control valve and consumable we stock.',
};

type Search = { q?: string; category?: string; sort?: string; stock?: string };

const SORTS: Record<string, string> = {
  relevance: 'Relevance',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name A–Z',
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const all = await getProducts();
  const categories = getCategories();

  const q = (sp.q ?? '').trim();
  const cat = sp.category ?? '';
  const sort = sp.sort ?? 'relevance';
  const stockOnly = sp.stock === 'in';

  let items = all;
  if (cat) items = items.filter((p) => p.category_slug === cat);
  if (q) items = searchProducts(items, q);
  if (stockOnly) items = items.filter((p) => p.in_stock);

  if (sort === 'price-asc') {
    items = [...items].sort((a, b) => a.effective_price - b.effective_price);
  } else if (sort === 'price-desc') {
    items = [...items].sort((a, b) => b.effective_price - a.effective_price);
  } else if (sort === 'name') {
    items = [...items].sort((a, b) => a.name.localeCompare(b.name));
  } else if (!q) {
    // "Relevance" with no query means default merchandising order; with a
    // query, searchProducts has already ranked the results.
    items = [...items].sort(byShopworthiness);
  }

  const activeCat = categories.find((c) => c.slug === cat);

  /** Preserve the other filters when one control changes. */
  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { q, category: cat, sort, stock: stockOnly ? 'in' : '', ...patch };
    if (next.q) p.set('q', next.q);
    if (next.category) p.set('category', next.category);
    if (next.sort && next.sort !== 'relevance') p.set('sort', next.sort);
    if (next.stock) p.set('stock', next.stock);
    const s = p.toString();
    return s ? `/catalog?${s}` : '/catalog';
  };

  return (
    <div className="shell py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
        <Link href="/" className="hover:text-aqua-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-soft">Catalog</span>
        {activeCat && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-ink-soft">{activeCat.name}</span>
          </>
        )}
      </nav>

      <header className="mt-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {activeCat ? activeCat.name : q ? `Results for “${q}”` : 'All products'}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {activeCat?.tagline ??
            'Softeners, filtration, DM water, valves and consumables.'}
        </p>
      </header>

      {/* The header carries the search field at every breakpoint, so this page
          does not repeat it. */}

      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* ------------------------------------------------------- filters */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="label">Category</h2>
          <ul className="space-y-0.5">
            <li>
              <Link
                href={href({ category: '' })}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  !cat ? 'bg-aqua-50 font-semibold text-aqua-800' : 'text-ink-soft hover:bg-ink/5'
                }`}
              >
                All ({all.length})
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={href({ category: c.slug })}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    cat === c.slug
                      ? 'bg-aqua-50 font-semibold text-aqua-800'
                      : 'text-ink-soft hover:bg-ink/5'
                  }`}
                >
                  {c.name} ({c.product_count})
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="label mt-6">Availability</h2>
          <Link
            href={href({ stock: stockOnly ? '' : 'in' })}
            className={`block rounded-lg px-3 py-2 text-sm ${
              stockOnly ? 'bg-aqua-50 font-semibold text-aqua-800' : 'text-ink-soft hover:bg-ink/5'
            }`}
          >
            {stockOnly ? '☑' : '☐'} In stock only
          </Link>
        </aside>

        {/* -------------------------------------------------------- results */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {items.length} product{items.length === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(SORTS).map(([key, label]) => (
                <Link
                  key={key}
                  href={href({ sort: key })}
                  className={`chip border ${
                    sort === key
                      ? 'border-aqua-300 bg-aqua-50 text-aqua-800'
                      : 'border-ink/10 bg-white text-ink-soft hover:border-ink/25'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-semibold">No products match that search.</p>
              <p className="mt-1 text-sm text-ink-soft">
                Try a contaminant (“iron”, “fluoride”) or a series name
                (“HydroSoft”).
              </p>
              <Link href="/catalog" className="btn-secondary mt-4">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.sku} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
