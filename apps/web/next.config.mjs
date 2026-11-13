/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@speedpilot/shared",
    "@speedpilot/security",
    "@speedpilot/database",
    "@speedpilot/pagespeed",
    "@speedpilot/seo-engine",
    "@speedpilot/ai-engine",
    "@speedpilot/report-generator",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

