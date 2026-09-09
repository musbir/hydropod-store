import type { MetadataRoute } from 'next';
import { allSkus, getCategories } from '@/lib/catalog';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${site.url}/supplier`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ...getCategories().map((c) => ({
      url: `${site.url}/catalog?category=${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...allSkus().map((sku) => ({
      url: `${site.url}/product/${sku}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
