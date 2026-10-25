import type { NextConfig } from "next";

// No cacheComponents / partial prefetching: every page behind the login renders per request, so the session
// check in app/(demo)/layout.tsx and the CSP nonce from proxy.ts apply to the whole page, not a static shell.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // same-origin, not no-referrer: with no-referrer browsers send "Origin: null" on every POST and the login
          // Origin check would refuse everyone. External links (wa.me, t.me) still get no referrer.
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
