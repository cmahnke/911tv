import { externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import strip from "@rollup/plugin-strip";
import inlineSource from "vite-plugin-inline-source";
import svg from "vite-plugin-svgo";
import svgr from "vite-plugin-svgr";

// External configs
import svgoConfig from "./svgo.config.mjs";

export default {
  main: {
    publicDir: "public",
    build: {
      lib: {
        entry: "./electron/main/index.js"
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    publicDir: "public",
    build: {
      lib: {
        entry: "./electron/preload/index.js"
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: ".",
    build: {
      rollupOptions: {
        input: "./index.html",
        output: {
          assetFileNames: `assets/[name].[ext]`
        }
      }
    },
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
          svgoConfig: svgoConfig
        }
      }),
      {
        ...strip({ include: "**/*.(jsx|js)" }),
        apply: "build"
      },
      inlineSource({ svgoOptions: svgoConfig }),
      svg(svgoConfig)
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        }
      }
    }
  }
};
