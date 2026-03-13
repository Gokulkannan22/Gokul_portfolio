import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/revenue-trend': 'http://127.0.0.1:7860',
      '/revenue-distribution': 'http://127.0.0.1:7860',
      '/top-customers': 'http://127.0.0.1:7860',
      '/customer-segmentation': 'http://127.0.0.1:7860',
      '/correlation-heatmap': 'http://127.0.0.1:7860',
    }
  }
})
