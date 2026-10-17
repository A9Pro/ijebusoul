import type { NextConfig } from "next";

// MERGE this into your existing next.config.ts rather than replacing it, if you already have other settings.
const nextConfig: NextConfig = {
  // Pulls only the icons you use out of lucide-react: much faster compiles and smaller pages.
  experimental: { optimizePackageImports: ["lucide-react"] },
  compress: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;