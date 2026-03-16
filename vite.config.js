import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/nilvera-api': {
        target: 'https://apitest.nilvera.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nilvera-api/, ''),
        secure: true,
      },
      '/nilvera-live': {
        target: 'https://api.nilvera.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nilvera-live/, ''),
        secure: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    minify: 'terser'
  }
});
