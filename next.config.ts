// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Désactive le linting pendant le build si nécessaire
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore les erreurs de type pendant le build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
