"""Step 4 - Image handling.

Downloads every product image referenced by the cleaned catalog from the
distributor CDN, then writes three optimised WebP renditions named after the
owning SKU so filenames stay stable when the merchant re-imports:

    <sku>-<n>.webp        1200px  detail / zoom
    <sku>-<n>-800.webp     800px  product page
    <sku>-<n>-400.webp     400px  catalog grid + cart thumbnail

Also emits data/image_manifest.json mapping SKU -> renditions + alt text, and
records the original CDN URL of every asset for attribution.
"""
import io, json, os, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
DEST = os.path.join(ROOT, "public", "images", "products")
UA = "Mozilla/5.0 (compatible; hydropod-catalog-import/1.0)"

WIDTHS = [(1200, ""), (800, "-800"), (400, "-400")]
QUALITY = 82

from PIL import Image, ImageOps  # noqa: E402


def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            if attempt == retries - 1:
                print("    !! %s -> %s" % (url[:70], e))
                return None
            time.sleep(1.5 * (attempt + 1))


def main():
    products = json.load(open(os.path.join(DATA, "products.json"), encoding="utf-8"))
    if not os.path.isdir(DEST):
        os.makedirs(DEST)

    manifest = {}
    total_src = total_out = 0
    ok = failed = 0

    for p in products:
        entries = []
        for img in p["images"]:
            # Ask the CDN for a bounded original rather than the full-size asset.
            url = img["source_url"]
            url += ("&" if "?" in url else "?") + "width=1600"
            blob = fetch(url)
            if not blob:
                failed += 1
                continue
            total_src += len(blob)

            try:
                im = Image.open(io.BytesIO(blob))
                im = ImageOps.exif_transpose(im)
                if im.mode in ("RGBA", "LA", "P"):
                    im = im.convert("RGBA")
                    bg = Image.new("RGB", im.size, (255, 255, 255))
                    bg.paste(im, mask=im.split()[-1])
                    im = bg
                else:
                    im = im.convert("RGB")
            except Exception as e:  # noqa: BLE001 - keep importing the rest
                print("    !! decode %s: %s" % (img["filename"], e))
                failed += 1
                continue

            base = img["filename"][:-5]  # strip ".webp"
            rendition = {}
            for w, suffix in WIDTHS:
                out = im.copy()
                if out.width > w:
                    out.thumbnail((w, w * 4), Image.LANCZOS)
                name = "%s%s.webp" % (base, suffix)
                path = os.path.join(DEST, name)
                out.save(path, "WEBP", quality=QUALITY, method=6)
                total_out += os.path.getsize(path)
                rendition[str(w)] = "/images/products/" + name

            entries.append({
                "position": img["position"],
                "alt": img["alt"],
                "src": rendition["1200"],
                "srcset": rendition,
                "width": im.width,
                "height": im.height,
                "source_url": img["source_url"],
            })
            ok += 1
            print("  %-26s %-22s %6.0f KB -> %5.0f KB"
                  % (p["sku"], base, len(blob) / 1024,
                     os.path.getsize(os.path.join(DEST, base + ".webp")) / 1024))

        manifest[p["sku"]] = entries

    with open(os.path.join(DATA, "image_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print("\n  %d images imported, %d failed" % (ok, failed))
    print("  source %.1f MB -> optimised %.1f MB across %d renditions (%.0f%% smaller)"
          % (total_src / 1e6, total_out / 1e6, ok * len(WIDTHS),
             100 * (1 - total_out / total_src) if total_src else 0))
    print("  -> public/images/products/")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
