import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/mcp",
        destination: "/",
        permanent: true,
      },
      {
        source: "/mcp-test",
        destination: "/",
        permanent: true,
      },
      {
        source: "/mcq",
        destination: "/mcq-test",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
