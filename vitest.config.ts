import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@speedpilot/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@speedpilot/security": path.resolve(__dirname, "packages/security/src/index.ts"),
      "@speedpilot/pagespeed": path.resolve(__dirname, "packages/pagespeed/src/index.ts"),
      "@speedpilot/seo-engine": path.resolve(__dirname, "packages/seo-engine/src/index.ts"),
      "@speedpilot/report-generator": path.resolve(__dirname, "packages/report-generator/src/index.ts"),
    },
  },
});
