import Link from 'next/link';
import type { Metadata } from 'next';
import { getCategories, getProducts } from '@/lib/catalog';
import { site, distributor } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Supplier & compliance',
  description:
    'Where this catalog comes from, how the imagery is licensed, and the compliance disclosures required of an Indian ecommerce marketplace.',
};

export default async function SupplierPage() {
  const products = await getProducts();
  const categories = getCategories();
  const imageCount = products.reduce((n, p) => n + p.images.length, 0);

  return (
    <div className="shell py-10">
      <div className="max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
          <Link href="/" className="hover:text-aqua-700">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-soft">Supplier &amp; compliance</span>
        </nav>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Supplier &amp; compliance
        </h1>
        <p className="mt-2 leading-relaxed text-ink-soft">
          {site.name} is an independent reseller. This page records where the
          catalog data and imagery come from, who owns them, and the disclosures
          required under Indian ecommerce and consumer-protection rules.
        </p>

        {/* ------------------------------------------------------ attribution */}
        <section className="card mt-8 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">
            Catalog attribution
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ['Brand', distributor.brand],
              ['Manufacturer group', distributor.parent],
              ['Source storefront', distributor.site],
              ['Data endpoint', distributor.catalogSource],
              ['Products imported', `${products.length} across ${categories.length} categories`],
              ['Images imported', `${imageCount} originals, 3 web renditions each`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd className="break-words text-sm text-ink-soft">
                  {String(v).startsWith('http') ? (
                    <a
                      href={String(v)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="underline hover:text-aqua-700"
                    >
                      {v}
                    </a>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            Product names, descriptions, technical specifications and photographs
            are the property of {distributor.brand} and {distributor.parent}. They
            are reproduced here for the purpose of reselling those products. All
            trade marks belong to their respective owners. {site.name} claims no
            ownership of the source material.
          </p>
        </section>

        {/* -------------------------------------------------- image licensing */}
        <section className="card mt-6 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">
            Image rights and licensing
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Images were retrieved from the distributor&apos;s public Shopify CDN.
              The site&apos;s <code className="rounded bg-ink/5 px-1">robots.txt</code>{' '}
              permits crawling of public product pages.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Crawl permission is not the same as a copyright licence. Before
              this storefront goes to production, the merchant must hold written
              authorisation from {distributor.brand} to reproduce its product
              photography and copy — normally part of a dealer agreement.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Every stored image records the URL it came from, so any asset can
              be traced, re-fetched or removed on request.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Takedown requests: email{' '}
              <a href={`mailto:${site.email}`} className="underline hover:text-aqua-700">
                {site.email}
              </a>
              . Assets are removed within 72 hours of a valid request.
            </li>
          </ul>
        </section>

        {/* -------------------------------------------------------- accuracy */}
        <section className="card mt-6 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">
            Accuracy of specifications and pricing
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Flow rates, pressures, regeneration figures and inlet limits are
              manufacturer statements. {site.name} has not independently verified
              them and they do not constitute a performance warranty.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Five systems are sold on quotation rather than a listed price,
              because they are sized against a customer water-test report. The
              source catalog carried placeholder prices on these; they are shown
              here as &ldquo;price on request&rdquo; rather than as a purchasable
              amount.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              One duplicate listing in the source catalog was removed during
              import. The full record is in{' '}
              <code className="rounded bg-ink/5 px-1">data/anomalies.csv</code>.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Listed prices are exclusive of GST, which is added at 18% (HSN
              8421) during checkout.
            </li>
          </ul>
        </section>

        {/* ------------------------------------------------------- compliance */}
        <section className="card mt-6 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">
            Statutory disclosures
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Required of an online marketplace under the Consumer Protection
            (E-Commerce) Rules 2020 and the Legal Metrology (Packaged
            Commodities) Rules 2011.
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ['Seller legal name', site.name],
              ['Registered address', site.address],
              ['GSTIN', site.gstin],
              ['Customer care', `${site.phone} · ${site.email}`],
              ['Grievance officer', `Grievance Officer, ${site.name}`],
              ['Response time', 'Acknowledged in 48 hours, resolved in 30 days'],
              ['Country of origin', 'India'],
              ['Returns', '7 days for unopened consumables; systems once installed are warranty-serviced, not returnable'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd className="text-sm leading-relaxed text-ink-soft">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            <strong>Demonstration notice.</strong> This storefront was built as a
            technical demonstration over a public catalog. The merchant identity,
            GSTIN, address and contact details above are placeholders and must be
            replaced with the real entity&apos;s details, and a dealer agreement
            with {distributor.brand} must be in place, before accepting live
            orders or payments.
          </p>
        </section>

        {/* ---------------------------------------------------------- privacy */}
        <section className="card mt-6 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">
            Data handling
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Checkout collects name, phone, email and delivery address solely to
              fulfil the order, as required under the Digital Personal Data
              Protection Act 2023.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              Card and UPI credentials are never handled by this application.
              Payment is completed inside the gateway&apos;s own interface, and
              only a payment reference is stored.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
              The cart is kept in your browser&apos;s local storage and is never
              transmitted until you place an order.
            </li>
          </ul>
        </section>

        <p className="mt-8 text-xs text-ink-faint">
          Last reviewed {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      </div>
    </div>
  );
}
