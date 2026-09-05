import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // @ts-ignore: vite-plugin-cesium type mismatch in this TS setup
    cesium(),
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["frequency-muskiness-traverse.ngrok-free.dev"],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
