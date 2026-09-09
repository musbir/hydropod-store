import crypto from 'node:crypto';

/**
 * Single shared secret guarding the merchant dashboard's write routes.
 *
 * This is deliberately minimal — it is a merchant-operated back office, not a
 * multi-tenant system. Swap for your SSO/IdP before production; see
 * docs/DEPLOYMENT.md. Without ADMIN_TOKEN set, writes are refused outright
 * rather than left open.
 */
export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

export function checkAdmin(req: Request): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return {
      ok: false,
      reason:
        'ADMIN_TOKEN is not configured on the server, so merchant writes are disabled.',
    };
  }
  const header = req.headers.get('x-admin-token') ?? '';
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return ok ? { ok: true } : { ok: false, reason: 'Invalid admin token.' };
}
