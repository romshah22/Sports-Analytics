import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  outputFileTracingIncludes: { '/api/predict': ['./models/win-model.json'], '/api/agent': ['./models/win-model.json'], '/model': ['./models/win-model.json'] },
};
export default nextConfig;
