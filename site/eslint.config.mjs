import globals from "globals";
import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";

export default tseslint.config(
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      eslintJs.configs.recommended,
      ...tseslint.configs.recommended,
      eslintReact.configs["recommended-typescript"],
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        electron: "readonly",
        projektemacher: "readonly",
      },
    },
    rules: {
      "no-warning-comments": ["warn", {}],
      "@typescript-eslint/no-unused-vars": ["warn"],
      "no-useless-assignment": "warn",
    },
  },
  {
    files: ["*.config.js"],
    extends: [eslintJs.configs.recommended],
    languageOptions: {
      globals: {
        // Vite config runs in Node.js environment
        ...globals.node,
        process: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { vars: "all", args: "after-used", ignoreRestSiblings: false },
      ],
      "no-console": ["warn", {}],
    },
  },

  {
    files: ["electron/**/*.{js,jsx,mjs,cjs}"],
    extends: [eslintJs.configs.recommended],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        electron: "readonly",
        projektemacher: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { vars: "all", args: "after-used", ignoreRestSiblings: false },
      ],
      "no-console": ["warn", {}],
    },
  },

  // JavaScript/JSX source files
  {
    files: ["src/**/*.{js,jsx,mjs,cjs}"],
    extends: [eslintJs.configs.recommended],
    settings: {
      react: {
        version: "detect",
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        electron: "readonly",
        projektemacher: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { vars: "all", args: "after-used", ignoreRestSiblings: false },
      ],
      "no-warning-comments": ["warn", {}],
      "no-console": ["warn", {}],
      "no-useless-assignment": "warn",
      // TODO: Readd: react/prop-types and react-refresh/only-export-components
    },
  },

  {
    ignores: ["dist/", "out/", "build/"],
  }
);
