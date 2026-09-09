"""Step 1 - Data extraction from the distributor storefront (hydropod.in, Shopify).

Pulls, in order:
  * products.json  (canonical product + variant + image records)
  * collections.json and per-collection product lists (category membership)
  * every product detail page HTML (descriptions + engineering spec blocks,
    which Shopify's Storefront JSON does not expose)

Writes raw payloads to data/raw/ so the cleaning step is reproducible offline.
"""
import json, os, re, time, urllib.request, urllib.error

BASE = "https://hydropod.in"
RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
UA = "Mozilla/5.0 (compatible; hydropod-catalog-import/1.0; +merchant catalog sync)"


def get(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode("utf-8", "replace")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == retries - 1:
                print(f"  !! FAILED {url}: {e}")
                return None
            time.sleep(1.5 * (attempt + 1))


def strip_tags(html):
    html = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?i)<br\s*/?>", "\n", html)
    html = re.sub(r"(?i)</(p|div|li|tr|h[1-6])>", "\n", html)
    html = re.sub(r"<[^>]+>", " ", html)
    for a, b in [("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
                 ("&quot;", '"'), ("&#39;", "'"), ("&rsquo;", "'"), ("&ldquo;", '"'),
                 ("&rdquo;", '"'), ("&ndash;", "-"), ("&mdash;", "-"), ("&deg;", " deg")]:
        html = html.replace(a, b)
    html = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), html)
    html = re.sub(r"[ \t\xa0]+", " ", html)
    return re.sub(r"\n\s*\n+", "\n", html).strip()


def main():
    os.makedirs(RAW, exist_ok=True)

    products = json.load(open(os.path.join(RAW, "products_p1.json")))["products"]
    print(f"products.json: {len(products)} products")

    # --- collection membership -------------------------------------------------
    collections = json.load(open(os.path.join(RAW, "collections.json")))["collections"]
    membership = {}
    for c in collections:
        h = c["handle"]
        txt = get(f"{BASE}/collections/{h}/products.json?limit=250")
        ids = [p["id"] for p in json.loads(txt)["products"]] if txt else []
        membership[h] = {"title": c["title"], "handle": h,
                         "description": strip_tags(c.get("body_html") or ""),
                         "product_ids": ids}
        print(f"  collection {h:26} -> {len(ids)} products")
        time.sleep(0.25)
    json.dump(membership, open(os.path.join(RAW, "collection_membership.json"), "w"), indent=1)

    # --- product detail pages --------------------------------------------------
    pages = {}
    for i, p in enumerate(products, 1):
        h = p["handle"]
        html = get(f"{BASE}/products/{h}")
        if not html:
            continue
        pages[h] = html
        print(f"  [{i:2}/{len(products)}] PDP {h:36} {len(html):>7} bytes")
        time.sleep(0.25)
    json.dump(pages, open(os.path.join(RAW, "product_pages.json"), "w"), indent=0)
    print(f"\nSaved {len(pages)} PDPs -> data/raw/product_pages.json")


if __name__ == "__main__":
    main()
