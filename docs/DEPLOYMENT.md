# Deployment

## Environments

| Environment | Trigger | Persistence | Payments |
|---|---|---|---|
| Local | `npm run dev` | JSON file under `DATA_DIR` | all demo |
| Docker | `docker compose up` | PostgreSQL container | all demo |
| Staging | push to `main` | Postgres (staging DB) | gateway test keys |
| Production | manual `workflow_dispatch` | Postgres (prod DB) | live keys |

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical URLs, OpenGraph, sitemap |
| `ADMIN_TOKEN` | yes | Guards `/api/admin/*`. Writes are refused if unset |
| `DATABASE_URL` | production | PostgreSQL. Unset ⇒ non-durable JSON driver |
| `DATA_DIR` | no | Where the JSON driver writes (default `.data`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | no | Live Razorpay checkout |
| `UPI_VPA` / `UPI_PAYEE_NAME` | no | Real UPI intent links |
| `PAYTM_MID` / `PAYTM_MERCHANT_KEY` | no | Paytm wallet |

Generate an admin token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Any gateway without credentials stays in **demo mode** and says so in the
checkout UI. No money can move in that state.

## Vercel

The app is a standard Next.js project; set the root directory to `web/`.

```bash
npm i -g vercel
cd web
vercel link
vercel env add ADMIN_TOKEN production
vercel env add DATABASE_URL production
vercel --prod
```

CI/CD is wired in `.github/workflows/deploy.yml`. Add these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Pushes to `main` deploy a staging preview. Production requires a manual
**Run workflow → production**, gated by a GitHub Environment so you can require
an approval.

> **Serverless caveat.** Without `DATABASE_URL`, each serverless instance keeps
> its own in-memory copy of orders and merchant edits. They will appear to work
> and then vanish. Attach a database before taking real orders — Vercel
> Postgres, Neon, Supabase and RDS all work with the standard connection string.

## Containers (AWS / Azure / DigitalOcean)

```bash
docker build -t hydropod-store web/
docker run -p 3000:3000 \
  -e ADMIN_TOKEN=... \
  -e DATABASE_URL=postgres://... \
  -e NEXT_PUBLIC_SITE_URL=https://store.example \
  hydropod-store
```

The image is a standalone Next.js server on Node 22 Alpine, runs as a non-root
user, and has a `HEALTHCHECK` hitting `/api/health`. Point your load balancer's
health probe at the same path.

## Database

```bash
export DATABASE_URL=postgres://user:pass@host:5432/hydropod
npm --prefix web run db:schema   # create tables (idempotent)
npm --prefix web run db:seed     # opening stock; keeps existing edits
```

`db:seed --force` resets prices, stock and offers to the imported values. It
discards merchant edits, so only use it on a fresh environment.

Only merchant overrides and orders live in the database — the catalog itself
ships with the build. That means a rollback of the app is also a rollback of the
catalog, and no migration is needed when the catalog changes.

## Image storage

Images are imported, optimised and served from `web/public/`, so no object store
is required and there are no per-request egress costs. `Cache-Control:
immutable` is set for a year and filenames are SKU-derived, so replacing an image
means rebuilding.

If the catalog grows past a few thousand images, move `public/images/products`
to S3/R2 behind a CDN and change `image_manifest.json` to hold absolute URLs —
`src/lib/catalog.ts` reads whatever the manifest contains, so nothing else needs
to change.

## Health checks

`GET /api/health` returns 200 with:

```json
{
  "status": "ok",
  "catalog": { "products": 33 },
  "persistence": "postgres",
  "admin_configured": true,
  "gateways": { "cod": "live", "upi": "demo", "razorpay": "demo", "paytm": "demo" }
}
```

Use `persistence` and `gateways` to confirm a deployment is configured the way
you intended — this is the fastest way to catch a missing env var.

## Going live

1. Replace the merchant identity in `web/src/lib/site.ts` (name, GSTIN, address,
   contact) and remove the demonstration notice from `/supplier`.
2. Confirm the dealer agreement with Hydropod/Doshion covers reproducing product
   imagery and copy.
3. Set `ADMIN_TOKEN` and `DATABASE_URL`; verify via `/api/health`.
4. Add live payment credentials; confirm the *Demo mode* badges are gone from
   checkout.
5. Replace the shared admin token with your SSO/IdP if more than one person
   needs dashboard access — `src/lib/auth.ts` is the single place to change.
6. Set real stock levels in the dashboard.

## Importing this repo into Vercel (2 minutes)

The Vercel MCP connector used during development could deploy files but was not
authorised for the projects/git API, so the project was not created
automatically. Import it once by hand and every later push deploys itself.

1. <https://vercel.com/new> → **Import Git Repository** → `musbir/hydropod-store`
   (authorise GitHub access to the repo if prompted — it is private).
2. **Root Directory: `web`.** This is the only setting that must be changed;
   `web/vercel.json` supplies the framework and build commands.
3. Add environment variables before the first deploy:
   - `ADMIN_TOKEN` — required, or the dashboard stays read-only
   - `NEXT_PUBLIC_SITE_URL` — the URL Vercel assigns, e.g. `https://hydropod-store.vercel.app`
   - `DATABASE_URL` — optional; without it orders are not durable
4. **Deploy.** The first build takes a few minutes: `prebuild` finds the
   committed WebP renditions and skips regeneration, so it is only `npm install`
   plus `next build`.
5. Confirm with `curl https://<your-url>/api/health` — check `persistence` and
   `gateways` read what you expect.

Serving from Mumbai (`bom1`) suits an India-facing store: set it under
**Project → Settings → Functions → Function Region**. It is deliberately not in
`vercel.json`, because the allowed regions depend on your plan and a rejected
value fails the build.

### Alternatively, let the assistant deploy it

Re-authenticate the Vercel connector so its token covers the `musbirk-9346`
scope's project and git APIs. `create_git_project` then links the repo in one
step. The failure to look for is:

```
403 forbidden — Not authorized: Trying to access resource under scope
"musbirk-9346". You must re-authenticate to this scope.
```
