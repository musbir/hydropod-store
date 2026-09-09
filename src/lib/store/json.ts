import fs from 'node:fs';
import path from 'node:path';
import type { Order, Override } from '../types';
import type { Store } from './index';

interface Snapshot {
  overrides: Record<string, Override>;
  orders: Record<string, Order>;
}

const EMPTY: Snapshot = { overrides: {}, orders: {} };

/**
 * Development / demo driver.
 *
 * Writes a single JSON snapshot to DATA_DIR so `npm run dev` keeps merchant
 * edits and orders across restarts. On a read-only filesystem (Vercel's
 * serverless runtime) the first write fails once, after which the driver stays
 * in memory for the life of the instance. That is intentional for the demo
 * deployment: set DATABASE_URL to get durable, shared persistence instead.
 */
export class JsonStore implements Store {
  readonly driver = 'json' as const;

  private file = path.join(process.env.DATA_DIR || '.data', 'store.json');
  private cache: Snapshot | null = null;
  private writable = true;

  private read(): Snapshot {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Snapshot;
    } catch {
      this.cache = structuredClone(EMPTY);
    }
    return this.cache!;
  }

  private write(): void {
    if (!this.writable) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.cache, null, 2));
    } catch {
      // Read-only FS: keep serving from memory rather than failing the request.
      this.writable = false;
    }
  }

  async getOverrides(): Promise<Record<string, Override>> {
    return this.read().overrides;
  }

  async setOverride(sku: string, patch: Partial<Override>): Promise<Override> {
    const snap = this.read();
    const next: Override = {
      ...(snap.overrides[sku] ?? { sku }),
      ...patch,
      sku,
      updated_at: new Date().toISOString(),
    };
    snap.overrides[sku] = next;
    this.write();
    return next;
  }

  async createOrder(order: Order): Promise<Order> {
    const snap = this.read();
    snap.orders[order.id] = order;
    this.write();
    return order;
  }

  async getOrder(id: string): Promise<Order | null> {
    return this.read().orders[id] ?? null;
  }

  async listOrders(): Promise<Order[]> {
    return Object.values(this.read().orders).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }

  async updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
    const snap = this.read();
    const cur = snap.orders[id];
    if (!cur) return null;
    const next = { ...cur, ...patch, id };
    snap.orders[id] = next;
    this.write();
    return next;
  }
}
