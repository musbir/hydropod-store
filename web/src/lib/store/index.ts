import type { Order, Override } from '../types';
import { JsonStore } from './json';
import { PostgresStore } from './postgres';

export interface Store {
  readonly driver: 'postgres' | 'json';
  getOverrides(): Promise<Record<string, Override>>;
  setOverride(sku: string, patch: Partial<Override>): Promise<Override>;
  createOrder(order: Order): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(): Promise<Order[]>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order | null>;
}

let singleton: Store | null = null;

/**
 * Chooses the persistence driver at runtime.
 *
 * DATABASE_URL set  -> PostgreSQL (production / staging)
 * otherwise         -> JSON file under DATA_DIR, degrading to in-process
 *                      memory on a read-only filesystem (serverless demo)
 *
 * Keeping this behind one interface means the storefront, checkout and admin
 * routes are identical in both modes.
 */
export function getStore(): Store {
  if (singleton) return singleton;
  singleton = process.env.DATABASE_URL
    ? new PostgresStore(process.env.DATABASE_URL)
    : new JsonStore();
  return singleton;
}
