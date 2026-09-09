import { NextResponse } from 'next/server';
import { getProductsForAdmin } from '@/lib/catalog';
import { getStore } from '@/lib/store';
import { checkAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Merchant view of the catalog, including deactivated rows. */
export async function GET(req: Request) {
  const auth = checkAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }
  const products = await getProductsForAdmin();
  const orders = await getStore().listOrders();
  return NextResponse.json({
    driver: getStore().driver,
    products: products.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price_type: p.price_type,
      base_price: p.base_price,
      effective_price: p.effective_price,
      offer_percent: p.offer_percent,
      stock_qty: p.stock_qty,
      active: p.active,
      image: p.images[0]?.srcset['400'] ?? null,
    })),
    orders,
  });
}

/** Update price, stock, offer or visibility for one SKU. */
export async function PATCH(req: Request) {
  const auth = checkAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sku?: string;
    price?: number;
    stock_qty?: number;
    offer_percent?: number;
    active?: boolean;
  };

  if (!body.sku) {
    return NextResponse.json({ error: 'sku is required.' }, { status: 400 });
  }

  const patch: Record<string, number | boolean> = {};
  if (body.price !== undefined) {
    const v = Number(body.price);
    if (!Number.isFinite(v) || v < 0 || v > 10_000_000) {
      return NextResponse.json({ error: 'Price out of range.' }, { status: 400 });
    }
    patch.price = Math.round(v * 100) / 100;
  }
  if (body.stock_qty !== undefined) {
    const v = Math.floor(Number(body.stock_qty));
    if (!Number.isFinite(v) || v < 0 || v > 100_000) {
      return NextResponse.json({ error: 'Stock out of range.' }, { status: 400 });
    }
    patch.stock_qty = v;
  }
  if (body.offer_percent !== undefined) {
    const v = Math.floor(Number(body.offer_percent));
    if (!Number.isFinite(v) || v < 0 || v > 90) {
      return NextResponse.json({ error: 'Offer must be 0-90%.' }, { status: 400 });
    }
    patch.offer_percent = v;
  }
  if (body.active !== undefined) patch.active = Boolean(body.active);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const override = await getStore().setOverride(body.sku, patch);
  return NextResponse.json({ override });
}
