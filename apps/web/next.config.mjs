/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@speedpilot/shared",
    "@speedpilot/security",
    "@speedpilot/database",
    "@speedpilot/pagespeed",
    "@speedpilot/seo-engine",
    "@speedpilot/ai-engine",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
