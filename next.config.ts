import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),

  // Tell Next.js NOT to bundle these — load from node_modules at runtime
  // so the Prisma native binary (.node file) is found correctly on Vercel
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
