import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icon.svg", "apple-touch-icon.png", "og-image.png"],
      manifest: {
        name: "가족 의료지갑",
        short_name: "의료지갑",
        description:
          "가족의 응급 의료신원·의료비 환급·진료기록을 한 곳에서. 보호자가 가족 의료를 대신 챙깁니다.",
        start_url: "/wallet",
        scope: "/",
        display: "standalone",
        background_color: "#F2F5F4",
        theme_color: "#0B3B3C",
        lang: "ko",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // 지도·외부 CDN은 캐시하지 않는다(네이버/카카오 지도는 항상 최신).
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5173 },
  build: { target: "es2022", sourcemap: true },
});
