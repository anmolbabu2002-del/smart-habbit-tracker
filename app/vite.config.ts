import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works from the Android app's local files as well as the website
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', target: 'es2020' }
});
