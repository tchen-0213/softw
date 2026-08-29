import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.{test,spec}.{js,jsx}'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../04_tests/reports/coverage/frontend',
      include: [
        'src/store/cartSlice.js',
        'src/store/productSlice.js',
        'src/utils/accountStorage.js',
        'src/services/api.js',
        'src/components/product/*.jsx',
        'src/components/cart/CartItem.jsx',
        'src/components/credit/CreditBadge.jsx',
        'src/components/user/AddressManager.jsx',
        'src/pages/auth/AuthPage.jsx',
        'src/pages/cart/CartPage.jsx'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  },
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
