#!/usr/bin/env node
/**
 * Build guard for product imagery.
 *
 * The optimised WebP renditions and `data/image_manifest.json` are committed,
 * so a normal build finds everything present and this script exits immediately.
 *
 * When they are missing — a partial checkout, a cleaned working tree, or a
 * deployment that shipped source only — it rebuilds them from the `source_url`
 * recorded against every image in `data/products.json`, which is the same
 * transform `scripts/03_images.py` performs during a full catalog import.
 *
 * Run automatically as `prebuild`. Force a rebuild with `--force`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(root, 'data');
const DEST = join(root, 'public', 'images', 'products');
const MANIFEST = join(DATA, 'image_manifest.json');

const WIDTHS = [
  [1200, ''],
  [800, '-800'],
  [400, '-400'],
];
const QUALITY = 82;
const force = process.argv.includes('--force');

const products = JSON.parse(readFileSync(join(DATA, 'products.json'), 'utf8'));
const expected = products.reduce((n, p) => n + (p.images?.length ?? 0), 0);

/** Every rendition of every image already on disk, and a manifest to match? */
function isComplete() {
  if (!existsSync(MANIFEST)) return false;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    return false;
  }
  let seen = 0;
  for (const p of products) {
    for (const img of p.images ?? []) {
      const base = img.filename.replace(/\.webp$/, '');
      for (const [, suffix] of WIDTHS) {
        if (!existsSync(join(DEST, `${base}${suffix}.webp`))) return false;
      }
      seen += 1;
    }
    if ((manifest[p.sku]?.length ?? 0) !== (p.images?.length ?? 0)) return false;
  }
  return seen === expected;
}

if (!force && isComplete()) {
  console.log(`Product imagery present (${expected} images). Nothing to do.`);
  process.exit(0);
}

console.log(
  `Rebuilding ${expected} product images from the distributor CDN ` +
    `(${WIDTHS.length} renditions each)…`,
);

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error(
    'sharp is required to rebuild imagery but is not installed.\n' +
      'Either run `npm install`, or restore the committed files under ' +
      'public/images/products/ and data/image_manifest.json.',
  );
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

async function fetchWithRetry(url, attempts = 3) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'hydropod-catalog-import/1.0' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

const manifest = {};
let ok = 0;
let failed = 0;

for (const product of products) {
  const entries = [];

  for (const img of product.images ?? []) {
    const url =
      img.source_url + (img.source_url.includes('?') ? '&' : '?') + 'width=1600';
    let blob;
    try {
      blob = await fetchWithRetry(url);
    } catch (err) {
      console.warn(`  !! ${img.filename}: ${err.message}`);
      failed += 1;
      continue;
    }

    const base = img.filename.replace(/\.webp$/, '');
    // Flatten transparency onto white so WebP matches the on-site look.
    const pipeline = sharp(blob).flatten({ background: '#ffffff' });
    const meta = await pipeline.metadata();
    const srcset = {};

    for (const [width, suffix] of WIDTHS) {
      const name = `${base}${suffix}.webp`;
      // Encode to a buffer and write with fs rather than sharp's toFile():
      // libvips is not long-path aware on Windows and fails on deep checkouts,
      // while Node's fs handles the \\?\ prefixing itself.
      const out = await pipeline
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 6 })
        .toBuffer();
      writeFileSync(join(DEST, name), out);
      srcset[String(width)] = `/images/products/${name}`;
    }

    entries.push({
      position: img.position,
      alt: img.alt,
      src: srcset['1200'],
      srcset,
      width: meta.width ?? 1200,
      height: meta.height ?? 1200,
      source_url: img.source_url,
    });
    ok += 1;
  }

  manifest[product.sku] = entries;
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Rebuilt ${ok} images (${ok * WIDTHS.length} renditions).`);
if (failed) {
  console.error(`${failed} image(s) could not be fetched.`);
  process.exit(1);
}
