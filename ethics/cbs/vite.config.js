import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: './index.html',
        'check-status': './check-status.html',
        kudoadmin: './kudoadmin.html',
        'payment-success': './payment-success.html',
        'payment-cancelled': './payment-cancelled.html'
      }
    }
  }
})
