/** @type {import('next').NextConfig} */
const nextConfig = {
  // For S3 deployment: use `output: 'export'` and restructure dynamic routes
  // For Lambda@Edge / Amplify: use `output: 'standalone'`
  // For local dev: default (no output setting) works best
  images: { unoptimized: true },
  transpilePackages: ['@sortyapp/shared'],
};

module.exports = nextConfig;
