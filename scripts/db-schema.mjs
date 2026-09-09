#!/usr/bin/env node
/** Applies db/schema.sql to $DATABASE_URL. Safe to re-run. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Nothing to do.');
  process.exit(1);
}

const { default: pg } = await import('pg');
const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(readFileSync(join(root, 'db', 'schema.sql'), 'utf8'));
  console.log('Schema applied.');
} finally {
  await client.end();
}
