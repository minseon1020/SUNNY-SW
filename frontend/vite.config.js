// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", 
  resolve: {
    alias: {
      "mapbox-gl": "maplibre-gl",   // ⬅ react-map-gl이 찾는 mapbox-gl을 maplibre-gl로 연결
    },
  },
  optimizeDeps: {
    exclude: ["mapbox-gl"],         // ⬅ 사전 번들에서 제외
  },
  build: {
    outDir: "dist",               // (기본값) 빌드 폴더
    assetsDir: "assets",          // (기본값) 정적 자산 폴더
    // chunkSizeWarningLimit: 2048 // 필요 시 경고 상향
  },
  server: {
    port: 5173, // React 개발 서버 포트
    proxy: {
      // API 요청을 Spring Boot(8080)으로 전달
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
