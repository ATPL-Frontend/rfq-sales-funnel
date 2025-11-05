// eslint.config.ts
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      // --- React / Vite hot refresh safety ---
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // --- React Hooks (extends already adds these; keep explicit) ---
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // --- TypeScript hygiene ---
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } }, // allows onClick={async () => ...}
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off", // flip to "warn" if you prefer

      // --- General JS polish ---
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",
      eqeqeq: ["error", "smart"],
      curly: ["error", "all"],
      "object-shorthand": ["error", "always"],
      "prefer-const": "error",
    },
  },
]);
