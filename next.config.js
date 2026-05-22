const path = require("node:path");

function resolveAnalyticsAlias() {
  const configDir = typeof __dirname === "string" ? __dirname : process.cwd();
  const relativeAliasPath = "lib/vendor/vercel-analytics-react.tsx";

  console.log("CONFIG next.resolveAlias", {
    configDir,
    hasDirname: typeof __dirname === "string",
    cwd: process.cwd(),
    relativeAliasPath,
  });

  if (!configDir || typeof configDir !== "string") {
    throw new Error("Invalid path configuration: next.config base directory is not a string");
  }

  return path.resolve(configDir, relativeAliasPath);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      "@vercel/analytics/react": "./lib/vendor/vercel-analytics-react.tsx",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@vercel/analytics/react": resolveAnalyticsAlias(),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.cloudinary.com https://maps.googleapis.com https://maps.gstatic.com https://api.groq.com https://serpapi.com; font-src 'self' data:",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
