/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // ESLint config location
  eslint: {
    dirs: ['app', 'lib', 'scripts'],
  },
}

module.exports = nextConfig

