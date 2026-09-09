'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from './CartProvider';
import { SearchBar } from './SearchBar';
import { site } from '@/lib/site';

const NAV = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/supplier', label: 'Supplier' },
  { href: '/admin', label: 'Admin' },
];

export function Header() {
  const { count, ready } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur">
      <div className="shell flex h-16 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-lg bg-aqua-600 text-lg font-bold text-white"
          >
            A
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold">{site.name}</span>
            <span className="block text-[11px] text-ink-faint">
              {site.tagline}
            </span>
          </span>
        </Link>

        <div className="ml-auto hidden min-w-0 flex-1 justify-center md:flex">
          <SearchBar />
        </div>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(n.href)
                  ? 'bg-aqua-50 text-aqua-700'
                  : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/cart"
          className="relative ml-1 rounded-lg p-2 text-ink-soft hover:bg-ink/5 hover:text-ink"
          aria-label={`Cart, ${ready ? count : 0} item${count === 1 ? '' : 's'}`}
        >
          <CartIcon />
          {ready && count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-aqua-600 px-1 text-[11px] font-bold text-white">
              {count}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-ink-soft hover:bg-ink/5 md:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile: search is always visible, nav collapses */}
      <div className="shell pb-3 md:hidden">
        <SearchBar />
        {open && (
          <nav className="mt-3 grid gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-ink/5"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3h2.2l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" />
    </svg>
  );
}
