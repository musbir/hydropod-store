/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone output is only needed for the container image; Vercel builds
  // the default target.
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  images: {
    // Product imagery is imported, optimised and served from /public, so the
    // remote loader is not needed. Local WebP is already sized at 400/800/1200.
    formats: ['image/webp'],
  },
  async headers() {
    return [
      {
        source: '/images/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
