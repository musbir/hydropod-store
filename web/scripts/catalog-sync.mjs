#!/usr/bin/env node
/**
 * Copies a freshly-imported catalog from the repo-root `data/` directory into
 * `web/data/`, which is what the build reads.
 *
 * Run after re-crawling the distributor:
 *   python scripts/01_extract.py && python scripts/02_clean.py && python scripts/03_images.py
 *   npm --prefix web run catalog:sync
 *
 * Refuses to overwrite with an obviously broken import (empty or truncated).
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(web, '..');
const src = join(repo, 'data');
const dest = join(web, 'data');

const FILES = ['products.json', 'categories.json', 'image_manifest.json'];

for (const f of FILES) {
  if (!existsSync(join(src, f))) {
    console.error(`Missing ${join(src, f)} — run the import scripts first.`);
    process.exit(1);
  }
}

const incoming = JSON.parse(readFileSync(join(src, 'products.json'), 'utf8'));
if (!Array.isArray(incoming) || incoming.length === 0) {
  console.error('Refusing to sync: products.json is empty or not an array.');
  process.exit(1);
}

let current = [];
try {
  current = JSON.parse(readFileSync(join(dest, 'products.json'), 'utf8'));
} catch {
  /* first run */
}

// A sudden collapse in catalog size almost always means a failed crawl.
if (current.length && incoming.length < current.length * 0.5) {
  console.error(
    `Refusing to sync: incoming catalog has ${incoming.length} products, ` +
      `down from ${current.length}. Re-run the crawl, or pass --force.`,
  );
  if (!process.argv.includes('--force')) process.exit(1);
}

for (const f of FILES) copyFileSync(join(src, f), join(dest, f));

const missingImages = incoming.filter((p) => !p.images?.length).length;
console.log(
  `Synced ${incoming.length} products, ${incoming.reduce((n, p) => n + (p.images?.length ?? 0), 0)} images.` +
    (missingImages ? ` ${missingImages} product(s) have no imagery.` : ''),
);
console.log('Rebuild to publish:  npm --prefix web run build');
