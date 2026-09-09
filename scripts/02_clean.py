"""Step 2 - Data cleaning and normalisation.

Merges the Storefront JSON with the parsed PDP HTML, normalises names, units and
categories, assigns a stable SKU to every product, drops duplicate/incomplete
rows, and emits the structured catalog consumed by the web app.

Outputs (data/):
  products.json  products.csv  categories.json  anomalies.csv  cleaning_log.md
"""
import csv, json, os, re, sys
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data")

LOG = []


def log(step, msg):
    LOG.append((step, msg))
    print("  [%s] %s" % (step, msg))


# --------------------------------------------------------------------------- #
# HTML helpers
# --------------------------------------------------------------------------- #
ENTITIES = [
    ("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
    ("&quot;", '"'), ("&#39;", "'"), ("&rsquo;", "’"),
    ("&ldquo;", '"'), ("&rdquo;", '"'), ("&ndash;", "–"),
    ("&mdash;", "—"), ("&times;", "x"),
]


def strip_tags(html):
    html = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?i)<br\s*/?>", "\n", html)
    html = re.sub(r"(?i)</(p|div|li|tr|h[1-6]|td|th)>", "\n", html)
    html = re.sub(r"<[^>]+>", " ", html)
    for a, b in ENTITIES:
        html = html.replace(a, b)
    html = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), html)
    html = re.sub(r"[ \t\xa0]+", " ", html)
    return re.sub(r"\n\s*\n+", "\n", html).strip()


SECTION_HEADS = ["About this product", "Also Included", "Features & Benefits",
                 "Technical Specifications"]
STOP_MARKERS = ["View full details", "Related Products", "Choose options"]

# The theme injects a quote CTA *between* "Features & Benefits" and "Technical
# Specifications", so it has to be excised rather than treated as a stop marker.
CTA_BLOCK = re.compile(r"(?s)Need Pricing\?.*?Get a Quote\s*")


def parse_pdp(html):
    """Pull the merchandising sections out of a product detail page."""
    main = re.search(r"(?s)<main.*?</main>", html) or re.search(r"(?s)<body.*?</body>", html)
    text = strip_tags(main.group(0) if main else html)

    start = text.find("About this product")
    if start < 0:
        return {}
    body = text[start:]
    for marker in STOP_MARKERS:
        i = body.find(marker)
        if i > 0:
            body = body[:i]
    body = CTA_BLOCK.sub("\n", body)

    idx = []
    for head in SECTION_HEADS:
        i = body.find(head)
        if i >= 0:
            idx.append((i, head))
    idx.sort()

    out = {}
    for n, (i, head) in enumerate(idx):
        end = idx[n + 1][0] if n + 1 < len(idx) else len(body)
        chunk = body[i + len(head):end]
        lines = []
        for raw in chunk.split("\n"):
            # Keep the bullet as a marker: inside Technical Specifications a
            # bullet starts a new key and an unbulleted line continues the
            # previous value (e.g. the two vessel sizes under "Available Sizes").
            bullet = bool(re.match(r"^\s*[•*]", raw))
            line = re.sub(r"^[•\-*\s]+", "", raw).strip().strip("\\ ").strip()
            if line and len(line) > 1:
                lines.append((bullet, line))
        out[head] = lines
    return out


def plain(lines):
    """Drop the bullet flags for prose sections."""
    return [text for _bullet, text in lines]


def product_jsonld(html):
    """Return the schema.org Product block from a PDP, or {}.

    The PDPs carry several ld+json blocks (Organization, Breadcrumb, and a
    storefront-chatbot config that also has a "description" key), so match on
    @type rather than scanning for the first "description".
    """
    for m in re.finditer(r'(?s)<script type="application/ld\+json">(.*?)</script>', html):
        try:
            d = json.loads(m.group(1).strip())
        except ValueError:
            continue
        if isinstance(d, dict) and d.get("@type") == "Product":
            return d
    return {}


def parse_specs(lines):
    """Technical Specifications lines -> ordered key/value pairs.

    Two layouts occur in this catalog:
      * bulleted  - a bullet starts a key, unbulleted lines continue the
                    previous value (the vessel sizes under "Available Sizes")
      * unbulleted - every "Label: value" line is its own key (Iron Buster)
    """
    specs = OrderedDict()
    key = None
    bulleted = any(b for b, _ in lines)

    for bullet, line in lines:
        starts_key = (bullet or not bulleted) and ":" in line
        if starts_key:
            k, v = line.split(":", 1)
            k, v = k.strip(" •-"), v.strip()
            # A value like "10 x 54 inch (Resin Volume: 45L)" is not a label.
            if k and len(k) < 60 and not k[:1].isdigit():
                key = k
                specs[key] = v
                continue
        if key is not None:  # continuation of a multi-line value
            specs[key] = (specs[key] + "; " + line).strip("; ")
    return dict((k, v) for k, v in specs.items() if v)


# --------------------------------------------------------------------------- #
# Normalisation rules
# --------------------------------------------------------------------------- #
TITLE_FIXES = {
    "SOFTNER VALVE": "Softener Valve",
    "FILTER VALVE": "Filter Valve",
    "TWIN VALVE": "Twin Valve",
    "Hexa pod": "Hexa Pod",
}

CATEGORY_FIXES = {
    "essential-accessiories": ("Essential Accessories", "essential-accessories"),
    "hydro-cap-series": ("Hydro Cap", "hydro-cap"),
    "hydrofilt-series": ("Hydrofilt", "hydrofilt"),
    "hydrosoft-series": ("HydroSoft", "hydrosoft"),
    "control-valve": ("Control Valves", "control-valves"),
    "d-ionpure": ("D-Ionpure", "d-ionpure"),
    "defender": ("Defender", "defender"),
    "power-pods": ("Power Pods", "power-pods"),
    "twin-pod": ("Twin Pod", "twin-pod"),
}

# category slug -> (sku series code, positioning line used on category pages)
SERIES = OrderedDict([
    ("hydrosoft", ("SFT", "Whole-house automatic water softeners")),
    ("hydrofilt", ("FLT", "Automatic sediment, carbon and iron filtration")),
    ("hydro-cap", ("CAP", "Manual 20-inch compact treatment for homes")),
    ("power-pods", ("PWR", "Dual-vessel skid systems, configured to your water")),
    ("defender", ("DEF", "Point-of-use cartridges for a single contaminant")),
    ("d-ionpure", ("DIP", "Mixed-bed demineralised water for labs and pharma")),
    ("control-valves", ("VLV", "OEM and aftermarket softener and filter heads")),
    ("essential-accessories", ("ACC", "Salt, resins, media and consumables")),
    ("twin-pod", ("TWN", "Twin-vessel duty/standby configurations")),
])

# Two products sit outside every collection but carry a series tag; the tag is a
# better signal than dumping them into Accessories.
TAG_TO_CATEGORY = {
    "Control Valves": ("Control Valves", "control-valves"),
    "Power Pods": ("Power Pods", "power-pods"),
    "Defender": ("Defender", "defender"),
    "D-Ionpure": ("D-Ionpure", "d-ionpure"),
}

# Products merchandised as quote-only upstream (placeholder public prices).
QUOTE_ONLY = set(["customize-your-own-power-pod", "filt-pod-hexa-pod",
                  "carbo-pod-purple-pod", "filt-pod-purple-pod", "power-pods"])

# Confirmed duplicate: handle copied from Filt Pod, title/media identical to
# Carbo Pod, price 8.3x the canonical row.
DUPLICATES = {"filt-pod-copy": "carbo-pod"}

SHORT_CODE = {
    "amber-pod": "AMBER", "purple-pod": "PURPLE", "hexa-pod": "HEXA", "opti-pod": "OPTI",
    "amber-cap": "AMBER", "purple-cap": "PURPLE", "hexa-buster": "HEXA", "iron-buster": "IRON",
    "filt-pod-1": "FILT", "carbo-pod": "CARBO", "iron-pod-1": "IRON",
    "softner-valve": "SOFT", "filter-valve": "FILT", "twin-valve": "TWIN",
    "salt-pellets": "SALT", "liquicharge": "LIQ", "ion-exchange-resins": "RESIN",
    "filtration-media": "MEDIA",
    "d-ionpure-cartridge": "CART", "d-ionpure-jumbo": "JUMBO",
    "d-ionpure-capsule": "CAPS", "d-ionpure-chameleon": "CHAM",
    "arsenic-removal": "ARSENIC", "iron-removal": "IRON", "fluoride-removal": "FLUORIDE",
    "nitrate-removal": "NITRATE", "uranium-removal": "URANIUM",
    "heavy-metal-removal": "HEAVYMETAL",
    "power-pods": "BASE", "customize-your-own-power-pod": "CUSTOM",
    "filt-pod-hexa-pod": "FILTHEXA", "carbo-pod-purple-pod": "CARBOPURPLE",
    "filt-pod-purple-pod": "FILTPURPLE",
}


def norm_title(t):
    t = re.sub(r"\s+", " ", (t or "").strip())
    if t in TITLE_FIXES:
        return TITLE_FIXES[t]
    if t.isupper() and len(t) > 3:
        t = t.title()
    return t


UNIT_RULES = [
    (r"salt-pellets", "25 kg bag"),
    (r"liquicharge", "5 L can"),
    (r"ion-exchange-resins", "25 L bag"),
    (r"filtration-media", "per cu.ft"),
    (r"-removal$", "1 cartridge"),
    (r"^d-ionpure", "1 cartridge"),
    (r"valve", "1 valve"),
]


def infer_unit(handle):
    for pat, unit in UNIT_RULES:
        if re.search(pat, handle):
            return unit
    return "1 unit"


# --------------------------------------------------------------------------- #
def main():
    products = json.load(open(os.path.join(RAW, "products_p1.json")))["products"]
    membership = json.load(open(os.path.join(RAW, "collection_membership.json")))
    pages = json.load(open(os.path.join(RAW, "product_pages.json")))

    print("Cleaning log")
    log("input", "%d products, %d collections, %d PDPs"
        % (len(products), len(membership), len(pages)))

    # product id -> (category title, slug); twin-pod is a marketing tag that
    # overlaps Hydrofilt, so it never wins over a real series.
    pid_to_cat = {}
    for h, c in membership.items():
        title, slug = CATEGORY_FIXES.get(h, (c["title"], h))
        for pid in c["product_ids"]:
            if slug == "twin-pod":
                pid_to_cat.setdefault(pid, (title, slug))
            else:
                cur = pid_to_cat.get(pid)
                if cur is None or cur[1] == "twin-pod":
                    pid_to_cat[pid] = (title, slug)
    log("category", "mapped %d products onto %d normalised categories"
        % (len(pid_to_cat), len(CATEGORY_FIXES)))
    log("category", "renamed source typo 'essential-accessiories' -> 'Essential Accessories'")

    anomalies = []
    cleaned = []
    seen_sku = {}

    for p in products:
        handle, pid = p["handle"], p["id"]
        title = norm_title(p["title"])

        if p["title"].strip() != title:
            log("title", "normalised %r -> %r" % (p["title"], title))

        if handle in DUPLICATES:
            anomalies.append(dict(
                sku="", handle=handle, severity="high", field="duplicate",
                issue="Duplicate of '%s' (copied handle, same media, 8.3x price)" % DUPLICATES[handle],
                action="dropped from catalog"))
            log("dedupe", "DROPPED %s - duplicate of %s" % (handle, DUPLICATES[handle]))
            continue

        if pid in pid_to_cat:
            cat_title, cat_slug = pid_to_cat[pid]
        else:
            hit = next((TAG_TO_CATEGORY[t] for t in (p.get("tags") or [])
                        if t in TAG_TO_CATEGORY), None)
            cat_title, cat_slug = hit or ("Essential Accessories", "essential-accessories")
            anomalies.append(dict(
                sku="", handle=handle, severity="low", field="category",
                issue="Not a member of any source collection",
                action="assigned to %s from its product tag" % cat_title if hit
                       else "assigned to Essential Accessories"))

        series_code = SERIES[cat_slug][0]
        code = SHORT_CODE.get(handle) or re.sub(r"[^A-Z0-9]", "", handle.upper())[:8]
        sku = "HP-%s-%s" % (series_code, code)
        if sku in seen_sku:
            sku = "%s-%s" % (sku, str(pid)[-3:])
        seen_sku[sku] = handle

        # ---- pricing -------------------------------------------------------
        variants = p.get("variants") or []
        prices = [float(v["price"]) for v in variants if v.get("price") is not None]
        positive = [x for x in prices if x > 0]
        quote_only = handle in QUOTE_ONLY or not positive
        base_price = min(positive) if positive else 0.0

        if quote_only:
            anomalies.append(dict(
                sku=sku, handle=handle, severity="medium", field="price",
                issue="Placeholder public price %s on a quote-led system" % prices,
                action="merchandised as Request a Quote"))

        # ---- PDP content ---------------------------------------------------
        html = pages.get(handle, "")
        sections = parse_pdp(html)
        about = plain(sections.get("About this product", []))
        description = about[0] if about else ""
        highlights = about[1:] if len(about) > 1 else []
        included = plain(sections.get("Also Included", []))
        features = plain(sections.get("Features & Benefits", []))
        specs = parse_specs(sections.get("Technical Specifications", []))

        ld = product_jsonld(html)

        if not description:
            lines = [l.strip() for l in strip_tags(ld.get("description") or "").split("\n")]
            lines = [l for l in lines if l]
            if lines:
                description, highlights = lines[0], lines[1:]
            anomalies.append(dict(
                sku=sku, handle=handle, severity="medium", field="description",
                issue="No 'About this product' block on the PDP",
                action="fell back to schema.org Product description"))

        # ---- schema.org category (finer than the collection) ---------------
        source_category = ld.get("category") or ""
        if source_category == "Balance Boards":  # Shopify theme boilerplate
            anomalies.append(dict(
                sku=sku, handle=handle, severity="low", field="schema_category",
                issue="JSON-LD category is theme boilerplate 'Balance Boards'",
                action="discarded"))
            source_category = ""

        # ---- vendor --------------------------------------------------------
        vendor = p.get("vendor") or ""
        if vendor in ("My Store", ""):
            anomalies.append(dict(
                sku=sku, handle=handle, severity="low", field="vendor",
                issue="Vendor is the Shopify default 'My Store'",
                action="normalised to Hydropod"))
            vendor = "Hydropod"

        if not any(v.get("sku") for v in variants):
            anomalies.append(dict(
                sku=sku, handle=handle, severity="medium", field="sku",
                issue="No SKU on any variant at source",
                action="assigned %s" % sku))

        # ---- images --------------------------------------------------------
        images = []
        for n, img in enumerate(p.get("images") or [], 1):
            images.append({
                "position": n,
                "source_url": img["src"],
                "filename": "%s-%d.webp" % (sku.lower(), n),
                "width": img.get("width"),
                "height": img.get("height"),
                "alt": "%s - %s water treatment system by Hydropod, view %d"
                       % (title, cat_title, n),
            })
        if not images:
            anomalies.append(dict(
                sku=sku, handle=handle, severity="high", field="images",
                issue="No product images at source", action="placeholder used"))

        available = any(v.get("available") for v in variants)
        if not available:
            anomalies.append(dict(
                sku=sku, handle=handle, severity="medium", field="availability",
                issue="Unavailable at source with no reason given",
                action="stock 0, shown as Out of stock"))

        cleaned.append({
            "sku": sku,
            "handle": handle,
            "name": title,
            "category": cat_title,
            "category_slug": cat_slug,
            "source_category": source_category,
            "vendor": vendor,
            "unit": infer_unit(handle),
            "price": round(base_price, 2),
            "compare_at_price": next((float(v["compare_at_price"]) for v in variants
                                      if v.get("compare_at_price")), None),
            "currency": "INR",
            "price_type": "quote" if quote_only else "listed",
            "description": description,
            "highlights": highlights,
            "included": included,
            "features": features,
            "specs": specs,
            "variants": [{"name": v.get("title"), "price": float(v["price"]),
                          "available": bool(v.get("available"))}
                         for v in variants if (v.get("title") or "") != "Default Title"],
            "in_stock": available,
            "stock_qty": 25 if available else 0,
            "images": images,
            "source_url": "https://hydropod.in/products/%s" % handle,
            "tags": p.get("tags") or [],
            "created_at": p.get("created_at"),
            "updated_at": p.get("updated_at"),
        })

    log("dedupe", "%d products retained of %d" % (len(cleaned), len(products)))
    log("sku", "assigned %d unique SKUs (convention HP-<series>-<code>)" % len(seen_sku))
    log("vendor", "mapped vendor 'My Store' -> 'Hydropod' (Shopify theme leftover)")
    log("price", "%d products merchandised as quote-only"
        % sum(1 for c in cleaned if c["price_type"] == "quote"))
    log("stock", "stock_qty seeded at 25 and merchant-editable; the source exposes only a boolean availability flag")
    log("unit", "units inferred per product family; source exposes no pack size (grams = 0 on every variant)")

    # ---- categories --------------------------------------------------------
    cats = []
    for slug in SERIES:
        code, blurb = SERIES[slug]
        members = [c for c in cleaned if c["category_slug"] == slug]
        if members:
            cats.append({"slug": slug, "name": members[0]["category"], "code": code,
                         "tagline": blurb, "product_count": len(members)})
    cats.sort(key=lambda c: -c["product_count"])

    # ---- write -------------------------------------------------------------
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    with open(os.path.join(OUT, "products.json"), "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)
    with open(os.path.join(OUT, "categories.json"), "w", encoding="utf-8") as f:
        json.dump(cats, f, indent=2, ensure_ascii=False)

    cols = ["sku", "handle", "name", "category", "category_slug", "vendor", "unit",
            "price", "currency", "price_type", "in_stock", "stock_qty",
            "description", "image_count", "primary_image", "source_url"]
    with open(os.path.join(OUT, "products.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for c in cleaned:
            row = dict((k, c.get(k)) for k in cols)
            row["image_count"] = len(c["images"])
            row["primary_image"] = c["images"][0]["filename"] if c["images"] else ""
            w.writerow(row)

    with open(os.path.join(OUT, "anomalies.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["sku", "handle", "severity", "field", "issue", "action"])
        w.writeheader()
        w.writerows(anomalies)

    with open(os.path.join(OUT, "cleaning_log.md"), "w", encoding="utf-8") as f:
        f.write("# Cleaning log\n\n")
        f.write("Source: https://hydropod.in (Shopify storefront JSON + product detail pages)\n\n")
        for step, msg in LOG:
            f.write("- **%s** - %s\n" % (step, msg))
        f.write("\n## Anomalies\n\n%d flagged. Full list in `anomalies.csv`.\n\n" % len(anomalies))
        f.write("| severity | count |\n|---|---|\n")
        for sev in ("high", "medium", "low"):
            f.write("| %s | %d |\n" % (sev, sum(1 for a in anomalies if a["severity"] == sev)))

    print("\n  -> %d products, %d categories, %d anomalies"
          % (len(cleaned), len(cats), len(anomalies)))
    print("  -> %d images referenced" % sum(len(c["images"]) for c in cleaned))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
