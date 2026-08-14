import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', '.pgdata/**', 'next-env.d.ts', '.vercel/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    // Scripts de Node: no-undef no aporta nada aquí (los globales son de Node) y en el
    // resto del proyecto ya lo cubre TypeScript.
    files: ['scripts/**/*.mjs', '*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      'no-undef': 'off',
    },
  },
);
