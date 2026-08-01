import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Next's automatic file tracing (deciding what ships in each serverless function
  // bundle) follows static imports — it can't see that Prisma picks its query-engine
  // binary at runtime based on the platform, so the non-native engine (rhel-openssl,
  // needed on Vercel) gets silently dropped from the bundle without this.
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
