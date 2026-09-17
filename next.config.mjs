/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['cesium'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://*.arcgisonline.com https://server.arcgisonline.com https://services.arcgisonline.com https://*.cesium.com https://*.ion.cesium.com",
              "font-src 'self' data:",
              "connect-src 'self' blob: https://*.supabase.co https://*.arcgisonline.com https://server.arcgisonline.com https://services.arcgisonline.com https://*.cesium.com https://api.cesium.com https://*.ion.cesium.com https://earthquake.usgs.gov https://api.open-meteo.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
