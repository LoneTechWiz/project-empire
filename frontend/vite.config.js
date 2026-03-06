import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    allowedHosts: ['project-empire.lonetechwiz.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8180',
        changeOrigin: true,
      }
    }
  }
})
