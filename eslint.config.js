import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.{js,ts}"],
    languageOptions: {
      globals: {
        global: true,
        process: true,
        __dirname: true,
      },
      ecmaVersion: 2021,
      sourceType: "module",
      parser: typescriptParser,
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  eslintConfigPrettier,
];
