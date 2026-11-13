import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
  console.log("Skipping Postgres db push (no PostgreSQL DATABASE_URL detected).");
  process.exit(0);
}

console.log("Pushing Prisma schema to PostgreSQL...");
execSync("npx prisma db push --schema=prisma/schema.prisma --skip-generate", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});
