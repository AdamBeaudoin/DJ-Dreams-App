/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
    unoptimized: true,
  },
  // Basic config that works for both local dev and Vercel
  experimental: {
    // Enable modern features
  },
}

module.exports = nextConfig 