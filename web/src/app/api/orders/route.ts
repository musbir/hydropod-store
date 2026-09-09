import { NextResponse } from 'next/server';
import { getProduct } from '@/lib/catalog';
import { getStore } from '@/lib/store';
import { computeTotals } from '@/lib/pricing';
import { isValidSlot } from '@/lib/slots';
import { upiIntent, createRazorpayOrder } from '@/lib/payments';
import type { CartLine, Customer, Order, PaymentMethod } from '@/lib/types';

export const dynamic = 'force-dynamic';

const METHODS: PaymentMethod[] = ['cod', 'upi', 'paytm', 'razorpay'];

function orderId(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AP-${stamp}-${rand}`;
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function validCustomer(c: Partial<Customer> | undefined): c is Customer {
  if (!c) return false;
  const required: (keyof Customer)[] = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode'];
  if (required.some((k) => !String(c[k] ?? '').trim())) return false;
  if (!/^[0-9+ ]{10,15}$/.test(String(c.phone))) return false;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(c.email))) return false;
  if (!/^[0-9]{6}$/.test(String(c.pincode))) return false;
  return true;
}

export async function POST(req: Request) {
  let body: {
    lines?: CartLine[];
    customer?: Customer;
    slot?: { date: string; window: string };
    payment_method?: PaymentMethod;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('Malformed request body.');
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return badRequest('Your cart is empty.');
  }
  if (body.lines.length > 50) {
    return badRequest('Too many lines in one order.');
  }
  if (!validCustomer(body.customer)) {
    return badRequest('Please check the delivery details — name, phone, email and a 6-digit PIN code are required.');
  }
  if (!isValidSlot(body.slot)) {
    return badRequest('Choose a valid delivery date and time window.');
  }
  const method = body.payment_method ?? 'cod';
  if (!METHODS.includes(method)) {
    return badRequest('Unsupported payment method.');
  }

  // Re-price every line from the catalog. Never trust prices from the client.
  const lines: CartLine[] = [];
  for (const raw of body.lines) {
    const qty = Math.floor(Number(raw?.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
      return badRequest(`Invalid quantity for ${raw?.sku ?? 'an item'}.`);
    }
    const product = await getProduct(String(raw?.sku ?? ''));
    if (!product) return badRequest(`Unknown product ${raw?.sku}.`);
    if (product.price_type === 'quote') {
      return badRequest(`${product.name} is quoted, not sold online. Please remove it from the cart.`);
    }
    if (!product.in_stock || product.stock_qty < qty) {
      return badRequest(`${product.name} does not have ${qty} in stock.`);
    }
    lines.push({
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      price: product.effective_price,
      qty,
      image: product.images[0]?.srcset['400'] ?? null,
    });
  }

  const totals = computeTotals(lines);
  const store = getStore();

  const order: Order = {
    id: orderId(),
    created_at: new Date().toISOString(),
    status: method === 'cod' ? 'confirmed' : 'pending_payment',
    lines,
    ...totals,
    currency: 'INR',
    payment_method: method,
    payment_status: method === 'cod' ? 'cod_due' : 'pending',
    payment_ref: null,
    slot: body.slot!,
    customer: body.customer,
    notes: String(body.notes ?? '').slice(0, 500),
  };

  await store.createOrder(order);

  // Decrement stock so the catalog reflects the sale.
  for (const line of lines) {
    const product = await getProduct(line.sku);
    if (product) {
      await store.setOverride(line.sku, {
        stock_qty: Math.max(0, product.stock_qty - line.qty),
      });
    }
  }

  // Attach whatever the chosen gateway needs to continue the payment.
  let payment: Record<string, unknown> = {};
  if (method === 'upi') {
    payment = { intent: upiIntent(order) };
  } else if (method === 'razorpay') {
    try {
      payment = { razorpay: await createRazorpayOrder(order) };
    } catch (err) {
      payment = {
        error: err instanceof Error ? err.message : 'Gateway unavailable',
      };
    }
  }

  return NextResponse.json({ order, payment }, { status: 201 });
}
