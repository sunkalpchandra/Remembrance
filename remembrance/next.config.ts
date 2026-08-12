import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const withMdx = createMDX();

const nextConfig: NextConfig = {
  /* config options here */
  rewrites: async () => {
    const backend =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    return [
      {
        source: "/test_neo4j/:path*",
        destination: `${backend}/test_neo4j/:path*`,
      },
      {
        source: "/user/:path*",
        destination: `${backend}/user/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [new URL("https://cdn.theorg.com/*")],
  },
};

export default withMdx(nextConfig);
