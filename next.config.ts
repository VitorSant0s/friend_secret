import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT === "export" ? { output: "export" as const } : {}),
  devIndicators: false,
  serverExternalPackages: ["@whiskeysockets/baileys", "pino"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
