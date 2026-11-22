import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const nextConfig: NextConfig = {
  // Phones use a network IP rather than localhost; keep dev hydration/HMR allowed.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap(
    (addresses) =>
      addresses
        ?.filter(({ family, internal }) => family === "IPv4" && !internal)
        .map(({ address }) => address) ?? [],
  ),
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL?.trim().replace(/\/+$/, "");
    if (!backendUrl) {
      return [];
    }
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
