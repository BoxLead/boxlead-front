import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-admin', 'dist-admin-e2e', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/admin', '**/admin/**'],
              message: 'The customer app must not import the backoffice. Move shared code to src.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['admin/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src/api/**', '**/src/context/**', '**/src/analytics/**', '**/src/routing/**', '**/src/theme/**', '**/src/data/**', '**/src/pages/**', '**/src/landing/**', '@auth0/*'],
              message: 'The backoffice only reuses the design system of src, never the customer app session, storage or analytics.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['e2e/**/*.ts', 'scripts/**/*.ts', '*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
