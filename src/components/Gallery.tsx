'use client';

import { useState } from 'react';
import type { ProductImage } from '@/lib/types';

export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const img = images[active] ?? images[0];

  return (
    <div>
      <div className="card media-box p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.srcset['1200'] ?? img.src}
          alt={img.alt}
          width={img.width}
          height={img.height}
          // The first gallery image is the LCP element on this route.
          fetchPriority="high"
        />
      </div>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((im, i) => (
            <li key={im.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length} for ${name}`}
                aria-current={i === active}
                className={`media-box w-full border p-1.5 transition-colors ${
                  i === active
                    ? 'border-aqua-400 ring-2 ring-aqua-200'
                    : 'border-ink/10 hover:border-ink/30'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.srcset['400'] ?? im.src}
                  alt=""
                  loading="lazy"
                  width={120}
                  height={120}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
