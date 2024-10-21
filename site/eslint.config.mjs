import globals from "globals";
import eslint from "@eslint/js";
import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  ...[eslint.configs.recommended, ...tseslint.configs.recommended].map((conf) => ({
    ...conf,
    files: ["src/**/*.{ts,tsx}"]
  })),
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser
      }
    },
    rules: {
      "no-warning-comments": ["warn", {}],
      "@typescript-eslint/no-unused-vars": ["warn"]
    }
  },
  {
    files: ["*.config.js"],
    ...eslint.configs.recommended,
    rules: {
      "no-unused-vars": ["warn", { vars: "all", args: "after-used", ignoreRestSiblings: false }],
      "no-console": ["warn", {}]
    }
  },
  {
    files: ["electon/**/*.{js,jsx,mjs,cjs}"],
    ...eslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        electron: true,
        process: true,
        __dirname: true,
        projektemacher: true
      }
    },
    rules: {
      "no-unused-vars": ["warn", { vars: "all", args: "after-used", ignoreRestSiblings: false }],
      "no-console": ["warn", {}]
    }
  },
  {
    files: ["src/**/*.{js,jsx,mjs,cjs}"],
    ...eslint.configs.recommended,
    settings: {
      react: {
        version: "detect"
      }
    },
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        electron: true,
        projektemacher: true
      }
    },
    plugins: {
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": reactRefresh,
      react
    },
    rules: {
      "no-unused-vars": ["warn", { vars: "all", args: "after-used", ignoreRestSiblings: false }],
      "no-warning-comments": ["warn", {}],
      "react/prop-types": [1],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-console": ["warn", {}]
    }
  },
  {
    ignores: ["dist/", "out/", "build/"]
  }
];
