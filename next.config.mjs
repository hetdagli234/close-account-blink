/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/api/actions/memo",
      },
    ];
  },
};

export default nextConfig;
