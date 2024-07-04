/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "https://www.thesendcoin.com",
      },
    ];
  },
};

export default nextConfig;
