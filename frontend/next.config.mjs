/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: fontOptionsStrict(),
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
};

function fontOptionsStrict() {
  return true;
}

export default nextConfig;
