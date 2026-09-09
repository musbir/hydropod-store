import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/CheckoutForm';
import { gatewayStatus } from '@/lib/payments';
import { availableSlots } from '@/lib/slots';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

// Gateway availability depends on server env, so render per request.
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return (
    <div className="shell py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Delivery details, installation slot and payment.
      </p>

      <CheckoutForm gateways={gatewayStatus()} slots={availableSlots()} />
    </div>
  );
}
