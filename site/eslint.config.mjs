import globals from "globals";
import pluginJs from "@eslint/js";
import react from "eslint-plugin-react";
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  pluginJs.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      "react-refresh": reactRefresh,
      react
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }
      ],
      'no-warning-comments': [
        'warn',
        {}
      ],
      'react/prop-types': [1],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    }
  },
  {
    ignores: ["dist/", "vite.config.js", "postcss.config.js"],
  }
]
