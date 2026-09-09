import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { verifyRazorpaySignature } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * Called by the client after Razorpay Checkout succeeds. The signature is
 * verified server-side before the order is marked paid — a client-reported
 * success is never sufficient.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    order_id?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields.' }, { status: 400 });
  }

  const store = getStore();
  const order = await store.getOrder(order_id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const ok = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!ok) {
    await store.updateOrder(order_id, { payment_status: 'failed' });
    return NextResponse.json(
      { error: 'Payment signature verification failed.' },
      { status: 400 },
    );
  }

  const updated = await store.updateOrder(order_id, {
    payment_status: 'paid',
    payment_ref: razorpay_payment_id,
    status: 'confirmed',
  });

  return NextResponse.json({ order: updated });
}
