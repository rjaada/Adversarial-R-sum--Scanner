/** @type {import('next').NextConfig} */
// Production sets BACKEND_URL (Azure Container Apps). The fallback is the local
// backend for `npm run dev` — never the old Railway host, which is dead.
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

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
