const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const jestPlugin = require("eslint-plugin-jest");

module.exports = [
  {
    ignores: [".next/", "node_modules/", "eslint.config.js", "**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.spec.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: { ...globals.browser }, // Apply browser globals to all .ts/.tsx files
      parserOptions: {
        project: "./tsconfig.json", // Ensure this path is correct
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  {
    // Configuration specifically for test files
    files: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.spec.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"],
    plugins: {
      jest: jestPlugin
    },
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node // Often needed in test environments as well
      }
    },
    rules: {
      ...jestPlugin.configs.recommended.rules
      // Potentially relax or add test-specific rules here if needed
      // e.g., allowing more "any" types in test setup might be acceptable
    }
  }
];

