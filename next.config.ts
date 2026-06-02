import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Postgres driver out of the bundler so it loads at runtime.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
