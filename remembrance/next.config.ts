import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import next from "next";

const withMdx = createMDX();

const nextConfig: NextConfig = {
  /* config options here */
  rewrites: async () => {
    return [
      {
        source: "/test_neo4j/:path*",
        destination: "http://localhost:5000/test_neo4j/:path*",
      },
      {
        source: "/user/:path*",
        destination: "http://localhost:5000/user/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [new URL("https://cdn.theorg.com/*")],
  },
};

export default withMdx(nextConfig);
