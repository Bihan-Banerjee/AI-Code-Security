import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    // Defaults preserved; override locally with VITE_PORT / VITE_PROXY_TARGET.
    port: Number(process.env.VITE_PORT) || 8080,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'https://darthbihan-ai-code-security-backend.hf.space',
        changeOrigin: true,
        secure: false
      },
    },
  },
  plugins: [
    react(),
    viteCompression({ algorithm: "gzip" }),
    viteCompression({ algorithm: "brotliCompress" }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "framer-motion",
      "animejs",
      "lenis",
      "recharts",
      "@uiw/react-codemirror",
      "@codemirror/lang-python",
      "@codemirror/lang-javascript",
      "@uiw/codemirror-theme-tokyo-night",
    ],
  },
}));
