// eslint.config.mjs
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "**/*.js"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: {
        node: true,
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "req|res|next",
        },
      ],

      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "warn",
    },
  },
);
