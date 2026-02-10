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
      // Exclude chrome-aws-lambda from webpack processing
      config.externals = [...(config.externals || []), 'chrome-aws-lambda', 'puppeteer-core']
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