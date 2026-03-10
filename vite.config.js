import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: path.join(__dirname, 'app/renderer'),
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
