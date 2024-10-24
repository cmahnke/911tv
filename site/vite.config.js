import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";
import stylelint from "vite-plugin-stylelint";
import browserslistToEsbuild from "browserslist-to-esbuild";
import strip from "@rollup/plugin-strip";
import svg from "vite-plugin-svgo";
//import lzstring from "./src/plugins/rollup-plugin-lz-string.js";
import inlineSource from "vite-plugin-inline-source";
import { join } from "path";
import svgr from "vite-plugin-svgr";

// External configs
import svgoConfig from "./svgo.config.mjs";

let defaultPort = 5173;

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: defaultPort
  },
  preview: {
    port: defaultPort
  },
  base: "./",
  plugins: [
    svgr({
      svgrOptions: {
        plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
        svgoConfig: svgoConfig
      }
    }),
    react(),
    eslint(),
    {
      ...strip({ include: "**/*.(jsx|js)" }),
      apply: "build"
    },
    stylelint({ build: true, dev: false, lintOnStart: true }),
    inlineSource({ svgoOptions: svgoConfig }),
    svg(
      svgoConfig
      /*{
      multipass: true,
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              cleanupIds: false
            }
          }
        }
      ]
    }
  */
    )
    /*
    {
      ...lzstring({ include: "src/assets/json/*.json" }),
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
        "911tv": "src/main.jsx"
      },
      output: {
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  resolve: {
    alias: [
      {
        find: /~(.+)/,
        replacement: join(process.cwd(), "node_modules/$1")
      }
    ]
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler"
      }
    }
  }
});
