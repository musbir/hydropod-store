import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getProducts } from '@/lib/catalog';
import { gatewayStatus } from '@/lib/payments';
import { adminTokenConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Liveness + configuration probe used by CI and uptime checks. */
export async function GET() {
  let products = 0;
  let ok = true;
  try {
    products = (await getProducts()).length;
  } catch {
    ok = false;
  }

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      catalog: { products },
      persistence: getStore().driver,
      admin_configured: adminTokenConfigured(),
      gateways: Object.fromEntries(
        gatewayStatus().map((g) => [g.method, g.live ? 'live' : 'demo']),
      ),
    },
    { status: ok ? 200 : 503 },
  );
}
