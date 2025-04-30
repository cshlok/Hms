/** @type {import("next").NextConfig} */
const nextConfig = {
  // Add other Next.js configurations here if needed
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);

