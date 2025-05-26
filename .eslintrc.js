module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    // Correctly configure the project option to use the tsconfig.json
    project: './tsconfig.json',
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended',
    'next/core-web-vitals',
  ],
  plugins: ['@typescript-eslint', 'react', 'prettier'],
  rules: {
    // General ESLint rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off', // Handled by TypeScript
    'no-use-before-define': 'off', // Handled by TypeScript
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // React specific rules
    'react/prop-types': 'off', // Not needed with TypeScript
    'react/react-in-jsx-scope': 'off', // Not needed with Next.js
    'react/display-name': 'off',
    'react/jsx-filename-extension': ['warn', { extensions: ['.jsx', '.tsx'] }],
    
    // Import rules
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    
    // Accessibility rules
    'jsx-a11y/anchor-is-valid': 'off', // Next.js uses its own Link component
    
    // Prettier rules
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
  },
  overrides: [
    // Override rules for specific file patterns
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['src/app/api/**/*.ts'],
      rules: {
        'import/no-anonymous-default-export': 'off',
      },
    },
  ],
};
