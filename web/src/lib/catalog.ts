import catalogJson from '@data/products.json';
import categoriesJson from '@data/categories.json';
import imageManifest from '@data/image_manifest.json';
import type {
  CatalogProduct,
  Category,
  Override,
  Product,
  ProductImage,
} from './types';
import { getStore } from './store';

const CATALOG = catalogJson as unknown as CatalogProduct[];
const CATEGORIES = categoriesJson as unknown as Category[];
const IMAGES = imageManifest as unknown as Record<string, ProductImage[]>;

const PLACEHOLDER: ProductImage = {
  position: 1,
  alt: 'Product image not available',
  src: '/images/placeholder.svg',
  srcset: { '400': '/images/placeholder.svg', '800': '/images/placeholder.svg', '1200': '/images/placeholder.svg' },
  width: 800,
  height: 800,
  source_url: '',
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Layer a merchant override onto an imported catalog row. */
function materialise(row: CatalogProduct, ov?: Override): Product {
  const basePrice = ov?.price ?? row.price;
  const offer = ov?.offer_percent ?? 0;
  const effective =
    row.price_type === 'quote' ? 0 : round2(basePrice * (1 - offer / 100));
  const stock = ov?.stock_qty ?? row.stock_qty;
  const images = IMAGES[row.sku]?.length ? IMAGES[row.sku] : [PLACEHOLDER];

  return {
    ...row,
    images,
    base_price: basePrice,
    offer_percent: offer,
    effective_price: effective,
    stock_qty: stock,
    in_stock: stock > 0,
    active: ov?.active ?? true,
  };
}

export async function getProducts(): Promise<Product[]> {
  const overrides = await getStore().getOverrides();
  return CATALOG.map((row) => materialise(row, overrides[row.sku])).filter(
    (p) => p.active,
  );
}

/** Includes deactivated rows — for the merchant dashboard only. */
export async function getProductsForAdmin(): Promise<Product[]> {
  const overrides = await getStore().getOverrides();
  return CATALOG.map((row) => materialise(row, overrides[row.sku]));
}

export async function getProduct(sku: string): Promise<Product | null> {
  const row = CATALOG.find(
    (p) => p.sku.toLowerCase() === sku.toLowerCase(),
  );
  if (!row) return null;
  const overrides = await getStore().getOverrides();
  return materialise(row, overrides[row.sku]);
}

export function getCategories(): Category[] {
  return CATEGORIES;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Every SKU in the imported catalog — used for static generation. */
export function allSkus(): string[] {
  return CATALOG.map((p) => p.sku);
}

/**
 * Keyword search across name, category, description, media and spec values.
 * Scored so that a name match outranks a description match.
 */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = products
    .map((p) => {
      const name = p.name.toLowerCase();
      const cat = p.category.toLowerCase();
      const body = [
        p.description,
        ...p.highlights,
        ...p.features,
        ...Object.values(p.specs),
        ...p.tags,
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const t of terms) {
        if (name === t) score += 100;
        else if (name.startsWith(t)) score += 40;
        else if (name.includes(t)) score += 25;
        if (cat.includes(t)) score += 12;
        if (p.sku.toLowerCase().includes(t)) score += 30;
        if (body.includes(t)) score += 5;
      }
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((r) => r.p);
}

/**
 * Default storefront ordering: things a visitor can actually buy come first.
 * Quote-only systems and out-of-stock rows sink, and richer records (specs,
 * imagery) outrank sparse ones within the same band.
 */
export function byShopworthiness(a: Product, b: Product): number {
  const listed =
    Number(b.price_type === 'listed') - Number(a.price_type === 'listed');
  if (listed) return listed;
  const stocked = Number(b.in_stock) - Number(a.in_stock);
  if (stocked) return stocked;
  const specs = Object.keys(b.specs).length - Object.keys(a.specs).length;
  if (specs) return specs;
  return b.images.length - a.images.length;
}

/**
 * Homepage picks. Takes the best row from each category before taking a second
 * from any, so the grid shows the range of the catalog rather than four near
 * identical softener photos.
 */
export function featured(products: Product[], n = 8): Product[] {
  const buckets = new Map<string, Product[]>();
  for (const p of [...products].sort(byShopworthiness)) {
    const list = buckets.get(p.category_slug) ?? [];
    list.push(p);
    buckets.set(p.category_slug, list);
  }

  const out: Product[] = [];
  let round = 0;
  while (out.length < n) {
    let added = false;
    for (const list of buckets.values()) {
      if (list[round]) {
        out.push(list[round]);
        added = true;
        if (out.length === n) break;
      }
    }
    if (!added) break; // every bucket exhausted
    round += 1;
  }
  return out;
}
