import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    AUTH_TRUST_HOST: "true",
  },
};

export default nextConfig;

