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
  async headers() {
    // The browser must always ask for a new service worker, or a fix to it could never arrive.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
  },
};

export default nextConfig;
