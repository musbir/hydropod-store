# Cleaning log

Source: https://hydropod.in (Shopify storefront JSON + product detail pages)

- **input** - 34 products, 9 collections, 34 PDPs
- **category** - mapped 32 products onto 9 normalised categories
- **category** - renamed source typo 'essential-accessiories' -> 'Essential Accessories'
- **dedupe** - DROPPED filt-pod-copy - duplicate of carbo-pod
- **title** - normalised 'TWIN VALVE' -> 'Twin Valve'
- **title** - normalised 'SOFTNER VALVE' -> 'Softener Valve'
- **title** - normalised 'FILTER VALVE' -> 'Filter Valve'
- **title** - normalised 'Hexa pod' -> 'Hexa Pod'
- **dedupe** - 33 products retained of 34
- **sku** - assigned 33 unique SKUs (convention HP-<series>-<code>)
- **vendor** - mapped vendor 'My Store' -> 'Hydropod' (Shopify theme leftover)
- **price** - 5 products merchandised as quote-only
- **stock** - stock_qty seeded at 25 and merchant-editable; the source exposes only a boolean availability flag
- **unit** - units inferred per product family; source exposes no pack size (grams = 0 on every variant)

## Anomalies

78 flagged. Full list in `anomalies.csv`.

| severity | count |
|---|---|
| high | 1 |
| medium | 45 |
| low | 32 |
