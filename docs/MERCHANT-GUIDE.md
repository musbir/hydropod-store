# Merchant guide

How to keep the storefront's catalog, stock and prices current. No coding
required for day-to-day work — only the last section needs a terminal.

---

## 1. Signing in

Go to **/admin** and enter your admin token.

The token is set by whoever runs the site (the `ADMIN_TOKEN` environment
variable). It is held only in that browser tab and is cleared when you sign out
or close the tab. If you lose it, ask your administrator to issue a new one —
it cannot be recovered.

## 2. The dashboard at a glance

The four tiles across the top show products listed, orders received, total order
value, and how many products are down to five units or fewer.

Below that are two tabs:

- **Catalog** — price, offer, stock and visibility for every product
- **Orders** — every order, with a status you can advance

The line under the heading says `Persistence: postgres` or `Persistence: json`.
If it says **json**, your edits are temporary and will be lost when the site
restarts — that is the demo configuration. Ask your administrator to connect a
database before relying on it.

## 3. Day-to-day changes

Every field saves when you click away from it or press **Enter**.

### Change a price

Type the new figure in the **Price (₹)** column. Enter the price *before* GST —
the storefront adds 18% at checkout.

Products showing **On request** have no price by design. They are quoted against
a customer's water-test report, so they cannot be given a shelf price here.

### Run an offer

Put a number in **Offer (%)**, between 0 and 90. The storefront then shows the
original price struck through, the discounted price beside it, and an orange
badge on the product tile. Set it back to `0` to end the offer.

The **Live price** column always shows what a customer actually pays, so you can
check the discount landed correctly.

### Update stock

Type the number of units you hold in **Stock**. Stock also decreases
automatically as orders come in.

At zero the product shows *Out of stock* and cannot be added to a cart. It stays
visible in the catalog so customers can still find it.

### Hide a product

Click the green **Visible** badge to turn it grey (**Hidden**). Hidden products
disappear from the storefront, search and sitemap immediately, but keep their
price and stock, so you can bring them back with one click.

Use this for a line you have stopped carrying. Use **Stock = 0** for something
you have simply run out of.

### Move an order along

On the **Orders** tab, pick the new state from the dropdown:

`pending payment → confirmed → packed → out for delivery → delivered`

`cancelled` is available at any point. Cash-on-delivery orders arrive as
*confirmed* already; online payments arrive as *pending payment* and become
*confirmed* once the gateway confirms.

Changes take up to a minute to appear on the public site, which is normal.

## 4. Refreshing the catalog from the distributor

Do this when Hydropod adds products, changes descriptions, or publishes new
photography. It needs a terminal and takes a few minutes.

```bash
# 1. Re-crawl the distributor and rebuild the catalog
python scripts/01_extract.py
python scripts/02_clean.py
python scripts/03_images.py

# 2. Publish it into the app
npm --prefix web run catalog:sync

# 3. Check nothing is broken
python scripts/validate_catalog.py

# 4. Rebuild and deploy
npm --prefix web run build
```

The sync step **refuses to run** if the new catalog has fewer than half the
products of the current one — that almost always means the crawl failed rather
than that the distributor deleted their range. Re-run the crawl first; use
`--force` only if the reduction is genuine.

Your prices, offers and stock levels are stored separately from the imported
catalog, so a re-import never overwrites them.

### After a re-import, check

- `data/cleaning_log.md` — what was renamed, dropped or defaulted
- `data/anomalies.csv` — every quality flag, with a suggested action
- New products arrive with a stock of 25 and no offer. Set real figures in the
  dashboard before advertising them.

## 5. Product images

Images come from the distributor automatically. Each is resized to three widths
(400 / 800 / 1200 px), converted to WebP, given alt text, and named after the
product's SKU — so `HP-SFT-AMBER` has `hp-sft-amber-1.webp` and so on.

To replace one by hand, drop a file with the same name into
`web/public/images/products/` and rebuild. Keep the SKU-based name, or the
product will fall back to a placeholder.

**Before you go live:** the imagery belongs to Hydropod and Doshion. Make sure
your dealer agreement covers reproducing their photography and copy on your own
storefront. The `/supplier` page states this publicly; keep it accurate.

## 6. Things to check before launch

- [ ] Replace the placeholder merchant identity in `web/src/lib/site.ts` — name,
      GSTIN, address, phone, email
- [ ] Review `/supplier` and remove the demonstration notice once the real
      details are in place
- [ ] Confirm the dealer agreement covers imagery and product copy
- [ ] Set a strong `ADMIN_TOKEN` and connect a database
- [ ] Add live payment credentials, then check the checkout no longer shows
      *Demo mode* badges
- [ ] Set real stock levels for all 33 products
