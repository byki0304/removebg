import path from "node:path";
import type { NextConfig } from "next";

// Standalone output feeds the Cloud Run image and the Electron bundle.
const standalone = process.env.NEXT_STANDALONE === "1";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@spritecut/shared"],
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: { bodySizeLimit: "60mb" },
  },
  ...(standalone ? { output: "standalone", outputFileTracingRoot: path.join(__dirname, "../..") } : {}),
};

export default nextConfig;
