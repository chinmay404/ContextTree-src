/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,   // dev-only badge; it sat over the board's Add button
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
