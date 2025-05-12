/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  trailingSlash: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  // Assurez-vous que les ressources statiques sont correctement chargées
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // Optimisation pour le déploiement Vercel
  outputFileTracing: true,
};

module.exports = nextConfig;
