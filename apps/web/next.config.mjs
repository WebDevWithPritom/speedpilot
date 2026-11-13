import fs from "node:fs";
import path from "node:path";

// Load root monorepo .env so Next.js dev/build picks up API keys stored at workspace root
const rootEnvPath = path.resolve(process.cwd(), "../../.env");
if (fs.existsSync(rootEnvPath)) {
  for (const line of fs.readFileSync(rootEnvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
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

