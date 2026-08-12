import type { MetadataRoute } from "next";

const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

// Only the public pages — the app itself is intentionally unindexed
// (see public/robots.txt).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/welcome`, priority: 1 },
    { url: `${BASE}/docs`, priority: 0.8 },
    { url: `${BASE}/docs/setup`, priority: 0.6 },
    { url: `${BASE}/docs/architecture`, priority: 0.6 },
    { url: `${BASE}/docs/caregivers`, priority: 0.6 },
  ];
}
