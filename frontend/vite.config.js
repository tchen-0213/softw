import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
