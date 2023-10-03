import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import {plugin as markdown, Mode} from 'vite-plugin-markdown';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint(),
    markdown({ mode: [Mode.HTML, Mode.TOC, Mode.MARKDOWN] })
  ],
})
