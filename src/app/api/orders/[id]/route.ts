import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { checkAdmin } from '@/lib/auth';
import type { OrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'packed',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await getStore().getOrder(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  return NextResponse.json({ order });
}

/** Merchant-only: advance an order through fulfilment. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = checkAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { status?: OrderStatus };
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Unknown order status.' }, { status: 400 });
  }

  const order = await getStore().updateOrder(id, { status: body.status });
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  return NextResponse.json({ order });
}
