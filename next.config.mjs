/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for slimmer production bundle (Node server)
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
