import Link from 'next/link';
import { site, distributor } from '@/lib/site';
import { getCategories } from '@/lib/catalog';

export function Footer() {
  const categories = getCategories();

  return (
    <footer className="mt-16 border-t border-ink/10 bg-white">
      <div className="shell grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="text-sm font-bold">{site.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {site.description}
          </p>
          <p className="mt-3 text-xs text-ink-faint">GSTIN {site.gstin}</p>
        </div>

        <div>
          <h2 className="text-sm font-bold">Shop</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/catalog?category=${c.slug}`}
                  className="text-ink-soft hover:text-aqua-700"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold">Information</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <Link href="/supplier" className="text-ink-soft hover:text-aqua-700">
                Supplier &amp; compliance
              </Link>
            </li>
            <li>
              <Link href="/catalog" className="text-ink-soft hover:text-aqua-700">
                Full catalog
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-ink-soft hover:text-aqua-700">
                Merchant dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold">Contact</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>{site.phone}</li>
            <li>{site.email}</li>
            <li className="leading-relaxed">{site.address}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="shell flex flex-col gap-2 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Product data and imagery
            supplied by{' '}
            <a
              href={distributor.site}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="underline hover:text-aqua-700"
            >
              {distributor.brand}
            </a>{' '}
            ({distributor.parent}).
          </p>
          <Link href="/supplier" className="underline hover:text-aqua-700">
            Attribution &amp; compliance
          </Link>
        </div>
      </div>
    </footer>
  );
}
