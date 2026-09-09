import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="shell py-24">
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="text-4xl font-extrabold text-aqua-600">404</p>
        <h1 className="mt-2 text-xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-ink-soft">
          That product or page is not in this catalog.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/catalog" className="btn-primary">
            Browse catalog
          </Link>
          <Link href="/" className="btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
