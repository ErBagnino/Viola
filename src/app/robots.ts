import type { MetadataRoute } from "next";

// A private app for two people: nothing here should ever be indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
