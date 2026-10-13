import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { '/api/predict': ['./models/win-model.json'], '/api/agent': ['./models/win-model.json'], '/model': ['./models/win-model.json'] },
};
export default nextConfig;
