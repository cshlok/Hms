const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const jestPlugin = require("eslint-plugin-jest");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");

// const nextPlugin = require("eslint-config-next"); // Temporarily removed due to @rushstack/eslint-patch incompatibility with ESLint 9

module.exports = [
  {
    ignores: [
      ".next/",
      "node_modules/",
      "eslint.config.js",
      ".eslintrc.json.bak",
      "eslint_test_results.txt",
      "eslint_debug_output.txt",
      "eslint_final_results.txt",
      "coverage/",
      "*.log"
    ]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Configuration for React/TypeScript files (components, pages, etc.)
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules, // For new JSX transform
      "react/prop-types": "off", // Not needed with TypeScript
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    }
  },
  {
    // Configuration specifically for TypeScript test files
    files: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.spec.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"],
    ...jestPlugin.configs['flat/recommended'],
  },
  {
    // Configuration specifically for JavaScript test files (e.g., in tests/api if they use Jest)
    files: ["tests/**/*.test.js", "tests/**/*.spec.js", "**/__tests__/**/*.js", "tests/api/*api-tests.js"], // Added pattern for pharmacy-api-tests.js
    ...jestPlugin.configs['flat/recommended'],
    languageOptions: {
      // flat/recommended should provide jest globals, but node might be needed too
      globals: {
        ...globals.jest,
        ...globals.node
      }
    }
  },
  {
    // Configuration for JavaScript configuration files (e.g., commitlint.config.js, jest.config.js, next.config.js)
    files: [
      "commitlint.config.js",
      "jest.config.js",
      "next.config.js",
      "postcss.config.js",
      "tailwind.config.js"
    ],
    languageOptions: {
      globals: {
        ...globals.node, // Defines 'module', 'require', 'process' etc.
      }
    }
  },
  {
    // Configuration for other JavaScript files, like scripts in tests/api that are not Jest tests
    // This specifically targets the files that had 'fetch' and 'console' undefined errors.
    // This block should ideally come AFTER the Jest specific JS config block to avoid overriding it for actual Jest tests.
    // However, ESLint applies configs in order, and the first match for a file wins for properties not merged.
    // Since the Jest block above is more specific for its patterns (e.g. *.test.js), it should be fine.
    files: ["tests/api/**/*.js"],
    languageOptions: {
        globals: {
            ...globals.node, // For 'console', 'process', etc.
            fetch: "readonly" // Define 'fetch' as a global
        }
    }
  }
];

