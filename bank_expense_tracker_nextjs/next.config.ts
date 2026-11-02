import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Every page is rendered on demand from a signed session and a live
     database. Cache Components' prerender validation would reject the way
     Mongoose builds queries (it constructs Dates internally), so the
     prerendering model is switched off. */
  cacheComponents: false,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
