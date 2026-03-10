import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  ...(process.env.NEXT_BUILD_OUTPUT ? { distDir: process.env.NEXT_BUILD_OUTPUT } : {}),
  allowedDevOrigins: [
    'http://192.168.31.218:3000',
    'http://192.168.31.*:3000',
  ],
};

export default withNextIntl(nextConfig);
