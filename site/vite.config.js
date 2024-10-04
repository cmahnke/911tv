import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";
import stylelint from "vite-plugin-stylelint";
import browserslistToEsbuild from "browserslist-to-esbuild";
import strip from "@rollup/plugin-strip";
import svg from "vite-plugin-svgo";
import lzstring from "./src/plugins/rollup-plugin-lz-string.js";
//import jsoncrush from "./src/plugins/rollup-plugin-jsoncrush.js";
import { join } from "path";

const jsonGlob = "src/assets/json/*.json";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react(/*{
      /*
        parserOpts: {
          plugins: ['optionalChainingAssign'],
        },
      },
    }*/),
    eslint(),
    {
      ...strip({ include: "**/*.(jsx|js)" }),
      apply: "build",
    },
    stylelint({ build: true, dev: false, lintOnStart: true }),
    svg({
      multipass: true,
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              cleanupIds: false,
            },
          },
        },
      ],
    }),
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
      input: {
        index: "./index.html",
        "911tv": "src/main.jsx",
      },
      output: {
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /~(.+)/,
        replacement: join(process.cwd(), "node_modules/$1"),
      },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
});
