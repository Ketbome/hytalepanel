import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const basePath = process.env.BASE_PATH || "";

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      "/panel-config": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      ...(basePath && {
        [`${basePath}/api`]: {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
        [`${basePath}/auth`]: {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
        [`${basePath}/socket.io`]: {
          target: "http://127.0.0.1:3000",
          ws: true,
        },
        [`${basePath}/panel-config`]: {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      }),
      // Default routes (no prefix)
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:3000",
        ws: true,
      },
    },
  },
  base: "./",
  build: {
    outDir: "../public-dist",
    emptyOutDir: true,
  },
});
