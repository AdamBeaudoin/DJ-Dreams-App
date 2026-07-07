/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      const prevIgnored = config.watchOptions && config.watchOptions.ignored
      const nodeModulesIgnored = [/node_modules/]
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: Array.isArray(prevIgnored)
          ? [...prevIgnored, ...nodeModulesIgnored]
          : prevIgnored
            ? [prevIgnored, ...nodeModulesIgnored]
            : nodeModulesIgnored,
      }
    }
    return config
  },
}

module.exports = nextConfig 