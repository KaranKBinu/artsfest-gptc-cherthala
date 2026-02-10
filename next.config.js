/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  transpilePackages: ['pdf-lib', '@pdf-lib/fontkit'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude @sparticuz/chromium from webpack processing
      config.externals = [...(config.externals || []), '@sparticuz/chromium', 'puppeteer-core']
    }

    // Ignore .map files
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader'
    })

    return config
  },
}

module.exports = nextConfig