import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

const appFiles = [
  "app.vue",
  "components/**/*.{vue,ts,js}",
  "composables/**/*.{ts,js}",
  "constants/**/*.{ts,js}",
  "pages/**/*.{vue,ts,js}",
  "server/**/*.{ts,js}",
  "types/**/*.{ts,js}",
  "utils/**/*.{ts,js}",
  "nuxt.config.ts",
  "i18n.config.ts",
];

export default tseslint.config(
  {
    ignores: [
      ".nuxt/**",
      ".output/**",
      "dist/**",
      "node_modules/**",
      "public/dictionaries/**",
      "locales/*.generated.*",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      "no-undef": "off",
      "vue/multi-word-component-names": "off",
    },
  },
  {
    files: appFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Nuxt auto-imports composables and Vue APIs, so `no-undef` is noisy here.
      "no-undef": "off",
    },
  },
  {
    files: [
      "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
      "tests/**/*.{js,mjs,cjs,ts,mts,cts}",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      "no-useless-escape": "warn",
    },
  },
  eslintConfigPrettier,
);
