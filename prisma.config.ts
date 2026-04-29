import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local so Prisma CLI picks up the same vars as Next.js
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
