import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@/components': path.resolve(import.meta.dirname, './src/components'),
      '@/hooks': path.resolve(import.meta.dirname, './src/hooks'),
      '@/services': path.resolve(import.meta.dirname, './src/services'),
      '@/types': path.resolve(import.meta.dirname, './src/types'),
      '@/utils': path.resolve(import.meta.dirname, './src/utils'),
      '@/store': path.resolve(import.meta.dirname, './src/store'),
      '@shared': path.resolve(import.meta.dirname, '../shared'),
    },
  },
  server: {
    port: 5174, // Different port from the original client
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
