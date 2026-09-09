-- Hydropod storefront — PostgreSQL schema
--
-- The imported catalog (products, categories, images) ships with the build as
-- JSON and is read-only at runtime, so the database holds only the two things
-- that actually change: merchant edits and customer orders.
--
-- Apply with:  npm run db:schema      (or: psql "$DATABASE_URL" -f db/schema.sql)

CREATE TABLE IF NOT EXISTS product_overrides (
    sku            TEXT PRIMARY KEY,
    price          NUMERIC(12, 2),
    stock_qty      INTEGER CHECK (stock_qty >= 0),
    offer_percent  INTEGER CHECK (offer_percent BETWEEN 0 AND 90),
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_overrides IS
    'Merchant edits layered over the imported catalog. A missing row means the imported values apply unchanged.';

CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    status      TEXT NOT NULL,
    payload     JSONB NOT NULL,
    CONSTRAINT orders_status_check CHECK (status IN (
        'pending_payment', 'confirmed', 'packed',
        'out_for_delivery', 'delivered', 'cancelled'
    ))
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders (status);

-- Lets the dashboard look an order up by customer phone without a full scan.
CREATE INDEX IF NOT EXISTS orders_phone_idx
    ON orders ((payload -> 'customer' ->> 'phone'));

COMMENT ON TABLE orders IS
    'Customer orders. payload holds the full immutable order document; status is denormalised for indexing.';
