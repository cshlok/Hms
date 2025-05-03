/** @type {import("next").NextConfig} */
const nextConfig = {
  // Add other Next.js configurations here if needed
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//   enabled: process.env.ANALYZE === "true",
// });

module.exports = nextConfig; // Use nextConfig directly

