// @ts-check
const { builtinModules } = require('node:module');
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const parser = require('@typescript-eslint/parser');
const path = require('node:path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  js.configs.recommended,
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
  ),
  {
    languageOptions: {
      parser: parser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    files: ['**/*.ts'],
    ignores: ['node_modules/**', 'dist/**', 'build/**', '.eslintrc.js'],
    rules: {
      'no-unused-vars': 'off', // TypeScript already checks this
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    }
  },
];