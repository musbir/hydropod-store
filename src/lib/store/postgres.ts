import type { Order, Override } from '../types';
import type { Store } from './index';

type QueryResult<T> = { rows: T[] };
interface PoolLike {
  query<T = unknown>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
}

/**
 * Production driver. Uses `pg` with plain SQL against the schema in
 * db/schema.sql — no ORM codegen step, so the build stays identical whether or
 * not a database is configured.
 *
 * `pg` is an optional dependency and is imported lazily, so a demo deployment
 * without DATABASE_URL never has to resolve it.
 */
export class PostgresStore implements Store {
  readonly driver = 'postgres' as const;

  private pool: Promise<PoolLike>;

  constructor(private url: string) {
    this.pool = this.connect();
  }

  private async connect(): Promise<PoolLike> {
    const { default: pg } = await import('pg');
    const needsSsl = !/localhost|127\.0\.0\.1/.test(this.url);
    return new pg.Pool({
      connectionString: this.url,
      max: 5,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    }) as unknown as PoolLike;
  }

  private async q<T>(text: string, values: unknown[] = []): Promise<T[]> {
    const pool = await this.pool;
    const res = await pool.query<T>(text, values);
    return res.rows;
  }

  async getOverrides(): Promise<Record<string, Override>> {
    const rows = await this.q<Override>(
      `SELECT sku, price, stock_qty, offer_percent, active,
              to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS updated_at
         FROM product_overrides`,
    );
    return Object.fromEntries(rows.map((r) => [r.sku, r]));
  }

  async setOverride(sku: string, patch: Partial<Override>): Promise<Override> {
    const rows = await this.q<Override>(
      `INSERT INTO product_overrides (sku, price, stock_qty, offer_percent, active, updated_at)
            VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), now())
       ON CONFLICT (sku) DO UPDATE SET
            price         = COALESCE(EXCLUDED.price,         product_overrides.price),
            stock_qty     = COALESCE(EXCLUDED.stock_qty,     product_overrides.stock_qty),
            offer_percent = COALESCE(EXCLUDED.offer_percent, product_overrides.offer_percent),
            active        = COALESCE(EXCLUDED.active,        product_overrides.active),
            updated_at    = now()
       RETURNING sku, price, stock_qty, offer_percent, active,
                 to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS updated_at`,
      [
        sku,
        patch.price ?? null,
        patch.stock_qty ?? null,
        patch.offer_percent ?? null,
        patch.active ?? null,
      ],
    );
    return rows[0];
  }

  async createOrder(order: Order): Promise<Order> {
    await this.q(
      `INSERT INTO orders (id, created_at, status, payload)
            VALUES ($1, $2, $3, $4)`,
      [order.id, order.created_at, order.status, JSON.stringify(order)],
    );
    return order;
  }

  async getOrder(id: string): Promise<Order | null> {
    const rows = await this.q<{ payload: Order }>(
      `SELECT payload FROM orders WHERE id = $1`,
      [id],
    );
    return rows[0]?.payload ?? null;
  }

  async listOrders(): Promise<Order[]> {
    const rows = await this.q<{ payload: Order }>(
      `SELECT payload FROM orders ORDER BY created_at DESC LIMIT 500`,
    );
    return rows.map((r) => r.payload);
  }

  async updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
    const cur = await this.getOrder(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id };
    await this.q(
      `UPDATE orders SET status = $2, payload = $3 WHERE id = $1`,
      [id, next.status, JSON.stringify(next)],
    );
    return next;
  }
}
