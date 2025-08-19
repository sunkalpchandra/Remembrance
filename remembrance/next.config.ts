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
        destination:
          "https://remembrance-backend.onrender.com/test_neo4j/:path*",
      },
      {
        source: "/user/:path*",
        destination: "https://remembrance-backend.onrender.com/user/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [new URL("https://cdn.theorg.com/*")],
  },
};

export default withMdx(nextConfig);
