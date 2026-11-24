import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NEXT_PUBLIC_YOMI_EMULATORS !== '1') return [];
    return [
      { source: '/google.firestore.v1.Firestore/:path*', destination: 'http://127.0.0.1:8780/google.firestore.v1.Firestore/:path*' },
      { source: '/v1/projects/:path*', destination: 'http://127.0.0.1:8780/v1/projects/:path*' },
      { source: '/identitytoolkit.googleapis.com/:path*', destination: 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/:path*' },
      { source: '/securetoken.googleapis.com/:path*', destination: 'http://127.0.0.1:9099/securetoken.googleapis.com/:path*' },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uploads.mangadex.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.mangadex.org',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
