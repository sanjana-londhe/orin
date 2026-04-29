import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Include Prisma generated client + engine binaries in the serverless bundle
  outputFileTracingIncludes: {
    "/api/**": [
      "./lib/generated/prisma/**",
      "./node_modules/@prisma/engines/**",
    ],
  },
};

export default nextConfig;
