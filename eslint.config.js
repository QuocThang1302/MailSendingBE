const js = require("@eslint/js");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "public/**",
      ".git/**",
      ".husky/**",
      "coverage/**",
      "dist/**",
      "build/**",
    ],
  },
];
