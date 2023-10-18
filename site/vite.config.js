import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import strip from '@rollup/plugin-strip';
import lzstring from './src/plugins/rollup-plugin-lz-string.js';
import jsoncrush from './src/plugins/rollup-plugin-jsoncrush.js';
import { join } from 'path';

const jsonGlob = 'src/assets/json/*.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint(),
    {
      ...strip({ include: '**/*.(jsx|js)' }),
      apply: 'build'
    },
    /*
    {
      ...lzstring({ include: jsonGlob }),
      enforce: 'pre',
      apply: 'build'
    },
    */
  ],
  build: {
    target: browserslistToEsbuild(),
    rollupOptions: {
      output: {
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  resolve: {
    alias: [
      {
        find: /~(.+)/,
        replacement: join(process.cwd(), 'node_modules/$1'),
      },
    ],
  }
})
