#!/usr/bin/env node
/**
 * Seeds product_overrides with the opening stock position from the imported
 * catalog, so a fresh database matches what the storefront shows.
 *
 * Idempotent: existing merchant edits are left alone unless --force is passed.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Nothing to do.');
  process.exit(1);
}

const products = JSON.parse(
  readFileSync(join(root, 'data', 'products.json'), 'utf8'),
);

const { default: pg } = await import('pg');
const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
});

await client.connect();
try {
  let written = 0;
  for (const p of products) {
    const res = await client.query(
      `INSERT INTO product_overrides (sku, price, stock_qty, offer_percent, active)
            VALUES ($1, $2, $3, 0, TRUE)
       ON CONFLICT (sku) DO ${force ? `UPDATE SET
            price = EXCLUDED.price,
            stock_qty = EXCLUDED.stock_qty,
            offer_percent = 0,
            active = TRUE,
            updated_at = now()` : 'NOTHING'}`,
      [p.sku, p.price_type === 'quote' ? null : p.price, p.stock_qty],
    );
    written += res.rowCount ?? 0;
  }
  console.log(
    `Seeded ${written} of ${products.length} products${force ? ' (forced)' : ' (existing rows kept)'}.`,
  );
} finally {
  await client.end();
}
