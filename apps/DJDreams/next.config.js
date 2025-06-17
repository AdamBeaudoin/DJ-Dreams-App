/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
    unoptimized: true, // Required for static export
  },
  // Configuration for subdirectory deployment
  basePath: process.env.NODE_ENV === 'production' ? '/radio' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/radio' : '',
  trailingSlash: true,
  // Remove output: 'export' for now to avoid server actions issue
}

module.exports = nextConfig 