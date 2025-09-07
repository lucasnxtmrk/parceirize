require('dotenv').config({ path: '.env.local' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;