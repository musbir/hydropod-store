export type PriceType = 'listed' | 'quote';

export interface ProductImage {
  position: number;
  alt: string;
  src: string;
  srcset: Record<string, string>;
  width: number;
  height: number;
  source_url: string;
}

export interface Variant {
  name: string;
  price: number;
  available: boolean;
}

/** A catalog row exactly as produced by scripts/02_clean.py. */
export interface CatalogProduct {
  sku: string;
  handle: string;
  name: string;
  category: string;
  category_slug: string;
  source_category: string;
  vendor: string;
  unit: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  price_type: PriceType;
  description: string;
  highlights: string[];
  included: string[];
  features: string[];
  specs: Record<string, string>;
  variants: Variant[];
  in_stock: boolean;
  stock_qty: number;
  images: { filename: string; alt: string; source_url: string }[];
  source_url: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  slug: string;
  name: string;
  code: string;
  tagline: string;
  product_count: number;
}

/** Merchant-controlled edits layered on top of the imported catalog. */
export interface Override {
  sku: string;
  price?: number;
  stock_qty?: number;
  offer_percent?: number;
  active?: boolean;
  updated_at: string;
}

/** A catalog row with merchant overrides and images resolved. */
export interface Product extends Omit<CatalogProduct, 'images'> {
  images: ProductImage[];
  offer_percent: number;
  effective_price: number;
  base_price: number;
  active: boolean;
}

export interface CartLine {
  sku: string;
  name: string;
  unit: string;
  price: number;
  qty: number;
  image: string | null;
}

export type PaymentMethod = 'cod' | 'upi' | 'paytm' | 'razorpay';
export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface DeliverySlot {
  date: string; // YYYY-MM-DD
  window: string; // e.g. "09:00-12:00"
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  id: string;
  created_at: string;
  status: OrderStatus;
  lines: CartLine[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_status: 'pending' | 'paid' | 'failed' | 'cod_due';
  payment_ref: string | null;
  slot: DeliverySlot;
  customer: Customer;
  notes: string;
}
