import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "output", "public/assets/image2"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ["scripts/verify-browser.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
);
