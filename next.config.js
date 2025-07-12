/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.pexels.com', 'via.placeholder.com', 'firebasestorage.googleapis.com'],
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
}

module.exports = nextConfig