import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision: "offline-v1" }],
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: false,
});

function securityHeaders() {
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "connect-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "media-src 'self' blob:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    },
  ];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["bcrypt", "pg", "@prisma/client", "@prisma/adapter-pg"],
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === "edge") {
      config.resolve.alias = {
        ...config.resolve.alias,
        bcrypt: false,
        pg: false,
        "@prisma/adapter-pg": false,
        "@prisma/client": false,
      };
    }
    return config;
  },
  async headers() {
    const headers = [...securityHeaders()];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default withSerwist(nextConfig);
