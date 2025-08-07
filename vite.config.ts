import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src/tauri/**"],
    },
  },
  build: {
    // Optimize for production
    minify: 'terser',
    sourcemap: false,  // Remove source maps
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks if needed
          vendor: ['react', 'react-dom'],
          tauri: ['@tauri-apps/api']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.logs
        drop_debugger: true
      }
    }
  }
});
