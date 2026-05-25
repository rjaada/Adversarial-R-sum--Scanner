/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || 'https://adversarial-r-sum-scanner-production.up.railway.app'

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${BACKEND}/health`,
      },
    ]
  },
}

module.exports = nextConfig
