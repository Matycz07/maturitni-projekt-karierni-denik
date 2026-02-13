import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async rewrites() {
    // Použije premennú prostredia, nebo inteligentní fallback
    let apiUrl = process.env.API_URL;

    if (!apiUrl) {
      // Pokud není zadáno (lokální vývoj nebo build mimo Docker bez ENV),
      // použijeme localhost.
      // V Dockeru je API_URL nastaveno přes docker-compose na 'http://backend:6602'.
      apiUrl = 'http://127.0.0.1:6602';
    }

    console.log(`[Next.js Rewrite] Environment: ${process.env.NODE_ENV}`);
    console.log(`[Next.js Rewrite] API_URL env var: '${process.env.API_URL}'`);
    console.log(`[Next.js Rewrite] Final API URL: ${apiUrl}`);

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;