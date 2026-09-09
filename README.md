# AquaPure Systems — storefront

A responsive ecommerce PWA built over the public **Hydropod** (Doshion)
water-treatment catalog at <https://hydropod.in>.

> **Scope note.** The brief asked for a *vegetables* store. Both provided
> sources — the Grok share link and hydropod.in — describe the same
> water-treatment catalog (softeners, filter pods, ion-exchange resins, control
> valves). There is no vegetable data in either. The storefront was therefore
> built over the real catalog rather than invented produce data. Everything
> else in the brief (search, cart, slot-based checkout, COD/UPI/Paytm/Razorpay,
> merchant dashboard, PWA, CI/CD) is implemented as specified.

---

## What is here

The Next.js app lives at the repository root, so Vercel and Docker need no
root-directory configuration.

```
src/app/                 Routes: home, catalog, product, cart, checkout, order, supplier, admin, api
src/lib/                 Catalog loader, pricing, slots, payments, auth, storage drivers
src/components/          Header, cart, gallery, checkout form, admin dashboard
data/                    The catalog: products.json/.csv, categories, image manifest,
                         anomalies, cleaning log. Written by the pipeline, imported by the build.
public/images/products/  294 optimised WebP renditions
scripts/                 Import pipeline (crawl -> clean -> images), image guard,
                         database helpers, CI catalog validator
db/schema.sql            PostgreSQL schema
.github/workflows/       CI (typecheck, validate, build, smoke test) + Vercel deploy
docker-compose.yml       Storefront + PostgreSQL for local parity
```

## Quick start

```bash
npm ci
cp .env.example .env.local     # set ADMIN_TOKEN
npm run dev
```

Open <http://localhost:3000>. The dashboard is at `/admin`.

With PostgreSQL:

```bash
docker compose up --build
docker compose exec web npm run db:schema
docker compose exec web npm run db:seed
```

## The data pipeline

| Stage | Script | Output |
|---|---|---|
| 1. Extract | `scripts/01_extract.py` | `data/raw/` — products.json, collection membership, 34 product pages |
| 2. Clean | `scripts/02_clean.py` | `data/products.json`, `.csv`, `categories.json`, `anomalies.csv`, `cleaning_log.md` |
| 3. Images | `scripts/03_images.py` | 294 WebP renditions + `data/image_manifest.json` |
| 4. Verify | `scripts/validate_catalog.py` | fails CI on malformed catalog data |

The pipeline writes straight into `data/`, which the build imports — there is no
separate publish step.

Re-import end to end:

```bash
python scripts/01_extract.py && python scripts/02_clean.py && python scripts/03_images.py
python scripts/validate_catalog.py
npm run build
```

`02_clean.py` refuses to overwrite `data/` when a run yields fewer than half the
products of the previous one, since that almost always means the crawl failed
rather than that the distributor dropped its range. Pass `--force` when the drop
is genuine.

### What cleaning changed

- **34 → 33 products.** `filt-pod-copy` was a duplicate Carbo Pod listing (copied
  handle, identical media, ₹10,000 vs the canonical ₹1,200) and was dropped.
- **SKUs assigned.** 33 of 34 source products had no SKU. Convention:
  `HP-<series>-<code>` (e.g. `HP-SFT-AMBER`). Image filenames derive from the
  SKU, so they stay stable across re-imports.
- **Vendor normalised.** `My Store` (a Shopify theme leftover) → `Hydropod`.
- **Titles normalised.** `SOFTNER VALVE` → `Softener Valve`, `Hexa pod` → `Hexa Pod`.
- **Category typo fixed.** `essential-accessiories` → `Essential Accessories`.
  Two products outside every collection were placed by their product tag.
- **Placeholder prices quarantined.** Five Power Pod rows carried ₹0/₹100/₹200
  dummy prices; they are merchandised as *Price on request* and cannot be added
  to a cart.
- **Specs parsed from HTML.** Flow, pressure, media, OBR and inlet limits appear
  only in the PDPs, not the Storefront JSON.

78 anomalies are itemised in `data/anomalies.csv`; the narrative is in
`data/cleaning_log.md`.

## Architecture

**Catalog is build-time data, state is runtime data.** The 33 products are
imported, validated and compiled into the build, so product pages are static and
fast. Only the two things that actually change — merchant edits and orders —
touch a database.

Persistence sits behind one interface (`src/lib/store/`) with two drivers:

| Driver | When | Durability |
|---|---|---|
| `postgres` | `DATABASE_URL` is set | Durable, shared |
| `json` | otherwise | File under `DATA_DIR`; **in-memory only on serverless** |

`/api/health` reports which driver is live.

### Trust boundaries

- Cart prices are **never** trusted. `POST /api/orders` re-reads every line from
  the catalog and recomputes the total server-side.
- Quote-only products are rejected at the API, not just hidden in the UI.
- Stock is re-checked at order time, so a stale cached page cannot oversell.
- Razorpay success is confirmed by HMAC signature verification server-side; a
  client-reported success is not sufficient.
- `/api/admin/*` requires `ADMIN_TOKEN` via `x-admin-token`, compared in constant
  time. With no token configured, writes are refused rather than left open.

## Payments

`cod` works out of the box. `upi`, `razorpay` and `paytm` each stay in a
clearly-labelled **demo mode** until their credentials are set, and the checkout
UI shows that badge to the customer. See `.env.example`.

## Documentation

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — environments, secrets, database, going live
- [`docs/MERCHANT-GUIDE.md`](docs/MERCHANT-GUIDE.md) — updating stock, prices, offers and imagery
- `/supplier` — attribution, image licensing and statutory disclosures

## Attribution

Product names, descriptions, specifications and photography belong to Hydropod
and Doshion, reproduced here for resale. `robots.txt` on the source permits
crawling public product pages, but **crawl permission is not a copyright
licence** — a dealer agreement covering imagery and copy must be in place before
production use. Every stored image records its origin URL. See `/supplier`.
