#!/usr/bin/env python3
"""CI guard for the imported catalog.

Fails the build when the data the storefront depends on is malformed: missing
SKUs, duplicate SKUs, broken category references, negative prices, or image
entries that do not have a corresponding optimised file on disk.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
IMAGE_DIR = os.path.join(ROOT, "public", "images", "products")

SKU_RE = re.compile(r"^HP-[A-Z]{3}-[A-Z0-9-]+$")

errors, warnings = [], []


def load(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def main():
    products = load("products.json")
    categories = load("categories.json")
    manifest = load("image_manifest.json")

    if not products:
        errors.append("products.json is empty")

    cat_slugs = {c["slug"] for c in categories}
    seen = {}

    for p in products:
        sku = p.get("sku", "")
        where = f"{sku or p.get('handle', '?')}"

        if not SKU_RE.match(sku):
            errors.append(f"{where}: SKU does not match HP-<SERIES>-<CODE>")
        if sku in seen:
            errors.append(f"{where}: duplicate SKU (also {seen[sku]})")
        seen[sku] = p.get("handle")

        for field in ("name", "category", "category_slug", "unit", "description"):
            if not str(p.get(field) or "").strip():
                errors.append(f"{where}: empty {field}")

        if p.get("category_slug") not in cat_slugs:
            errors.append(f"{where}: category_slug {p.get('category_slug')!r} not in categories.json")

        price = p.get("price")
        if not isinstance(price, (int, float)) or price < 0:
            errors.append(f"{where}: invalid price {price!r}")
        if p.get("price_type") == "listed" and not price:
            errors.append(f"{where}: listed product with a zero price")

        stock = p.get("stock_qty")
        if not isinstance(stock, int) or stock < 0:
            errors.append(f"{where}: invalid stock_qty {stock!r}")

        images = manifest.get(sku, [])
        if not images:
            warnings.append(f"{where}: no images in the manifest")
        for img in images:
            if not img.get("alt"):
                errors.append(f"{where}: image {img.get('src')} has no alt text")
            for width, path in (img.get("srcset") or {}).items():
                disk = os.path.join(IMAGE_DIR, os.path.basename(path))
                if not os.path.isfile(disk):
                    errors.append(f"{where}: missing image file {os.path.basename(path)} ({width}px)")

    # Category counts must agree with the products actually present.
    for c in categories:
        actual = sum(1 for p in products if p.get("category_slug") == c["slug"])
        if actual != c.get("product_count"):
            errors.append(
                f"category {c['slug']}: product_count={c.get('product_count')} but {actual} products reference it"
            )

    print(f"Checked {len(products)} products, {len(categories)} categories, "
          f"{sum(len(v) for v in manifest.values())} images.")
    for w in warnings:
        print(f"  warning: {w}")
    for e in errors:
        print(f"  ERROR: {e}")

    if errors:
        print(f"\nFAILED with {len(errors)} error(s).")
        return 1
    print("\nCatalog OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
