import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './',
 root: 'app/renderer', // Tell Vite to use app/renderer as root
  build: {
    outDir: path.join(__dirname, 'app/renderer/dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/renderer/src')
    }
  }
});
