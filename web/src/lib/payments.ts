import crypto from 'node:crypto';
import type { Order, PaymentMethod } from './types';

export interface GatewayConfig {
  method: PaymentMethod;
  label: string;
  description: string;
  /** True when real credentials are present for this method. */
  live: boolean;
}

const upiVpa = process.env.UPI_VPA || '';
const upiPayee = process.env.UPI_PAYEE_NAME || 'Hydropod Store';

export function gatewayStatus(): GatewayConfig[] {
  return [
    {
      method: 'cod',
      label: 'Cash on delivery',
      description: 'Pay the installation engineer when the system is delivered.',
      live: true,
    },
    {
      method: 'upi',
      label: 'UPI',
      description: upiVpa
        ? `Pay to ${upiVpa} from any UPI app.`
        : 'Scan-and-pay via any UPI app. Demo mode: no VPA configured.',
      live: Boolean(upiVpa),
    },
    {
      method: 'razorpay',
      label: 'Card / Netbanking (Razorpay)',
      description: process.env.RAZORPAY_KEY_ID
        ? 'Cards, netbanking, wallets and UPI via Razorpay.'
        : 'Razorpay checkout. Demo mode: no API keys configured.',
      live: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    },
    {
      method: 'paytm',
      label: 'Paytm wallet',
      description: process.env.PAYTM_MID
        ? 'Pay from your Paytm balance.'
        : 'Paytm wallet. Demo mode: no merchant ID configured.',
      live: Boolean(process.env.PAYTM_MID && process.env.PAYTM_MERCHANT_KEY),
    },
  ];
}

/** `upi://` intent string a phone can open, or a QR can encode. */
export function upiIntent(order: Order): string | null {
  if (!upiVpa) return null;
  const params = new URLSearchParams({
    pa: upiVpa,
    pn: upiPayee,
    tr: order.id,
    am: order.total.toFixed(2),
    cu: 'INR',
    tn: `Hydropod order ${order.id}`,
  });
  return `upi://pay?${params.toString()}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  key_id: string | null;
  simulated: boolean;
}

/**
 * Creates a Razorpay order server-side. With no API keys present the call is
 * simulated so the checkout flow stays walkable in the demo deployment — the
 * response is explicitly flagged `simulated` and no money can move.
 */
export async function createRazorpayOrder(order: Order): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const amount = Math.round(order.total * 100); // paise

  if (!keyId || !keySecret) {
    return {
      id: `order_sim_${order.id}`,
      amount,
      currency: 'INR',
      key_id: null,
      simulated: true,
    };
  }

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: order.id,
      notes: { order_id: order.id },
    }),
  });

  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { id: string; amount: number; currency: string };
  return {
    id: body.id,
    amount: body.amount,
    currency: body.currency,
    key_id: keyId,
    simulated: false,
  };
}

/** Verifies the HMAC Razorpay returns on a successful client-side payment. */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}
