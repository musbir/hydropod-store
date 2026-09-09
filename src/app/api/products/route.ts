import { NextResponse } from 'next/server';
import { getCategories, getProducts, searchProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** Public read-only catalog feed. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const category = url.searchParams.get('category') ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200);

  let items = await getProducts();
  if (category) items = items.filter((p) => p.category_slug === category);
  if (q) items = searchProducts(items, q);

  return NextResponse.json({
    count: items.length,
    categories: getCategories(),
    products: items.slice(0, limit).map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: p.effective_price,
      price_type: p.price_type,
      currency: p.currency,
      in_stock: p.in_stock,
      stock_qty: p.stock_qty,
      image: p.images[0]?.src ?? null,
      url: `/product/${p.sku}`,
      source_url: p.source_url,
    })),
  });
}
