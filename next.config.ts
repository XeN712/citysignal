import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://172.21.32.1:3000',
    'http://172.21.32.1:3001',

  ],
};

module.exports = nextConfig;
;

export default nextConfig;
