/** @type {import('next').NextConfig} */
const nextConfig = {
  // 소스맵 관련 설정
  productionBrowserSourceMaps: false,

  // 개발 환경에서 소스맵 비활성화
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.devtool = false;
    }
    return config;
  },
};

module.exports = nextConfig;
