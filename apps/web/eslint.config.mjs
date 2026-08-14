import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jsxa11y from 'eslint-plugin-jsx-a11y';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxa11y,
    },
    rules: {
      ...jsxa11y.configs.recommended.rules,
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'dist/**'],
  },
];

export default eslintConfig;
