/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration minimale pour Vercel
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: true,
  },
  // Désactiver les optimisations qui pourraient causer des problèmes
  swcMinify: false,
};

module.exports = nextConfig;
