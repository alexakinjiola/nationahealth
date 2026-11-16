import type { MetadataRoute } from "next";

/** Only the public pages are worth indexing; everything behind sign-in is private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/facilities", "/privacy", "/register"], disallow: ["/api/", "/admin", "/provider", "/home", "/records", "/auth", "/dev"] },
  };
}
