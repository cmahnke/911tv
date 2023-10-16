import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import strip from '@rollup/plugin-strip';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint(),
    {
      ...strip({ include: '**/*.(jsx|js)' }),
      apply: 'build'
    }
  ],
  build: {
    target: browserslistToEsbuild(),
    rollupOptions: {
      output: {
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})
