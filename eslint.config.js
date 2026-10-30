import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { noLiteralText } from './eslint/noLiteralText.js'

const I18N_PENDING = [
  'src/components/EmptyState/**',
  'src/components/Logo/**',
  'src/components/NotificationSettings/**',
  'src/components/Notifications/**',
  'src/components/icons/**',
  'src/pages/Account/**',
  'src/pages/Agents/**',
  'src/pages/Billing/**',
  'src/pages/Categories/**',
  'src/pages/Connections/**',
  'src/pages/LeadDetail/**',
  'src/pages/Leads/**',
  'src/pages/Metrics/**',
  'src/pages/Notifications/**',
  'src/pages/OAuthCallback/**',
  'src/pages/Reseller/**',
  'src/platforms/**',
]

const UNTRANSLATED_NAMES = ['BoxLead', 'WhatsApp', 'WhatsApp Business', 'Instagram', 'Messenger', 'MercadoLibre', 'Facebook', 'Google', 'TikTok', 'LinkedIn', 'Google Ads', 'Meta', '24/7']

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
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx', 'src/pages/Legal/**', 'src/pages/ConsumerRequest/**', 'src/pages/DesignSystem/**', ...I18N_PENDING],
    plugins: { i18n: { rules: { 'no-literal-text': noLiteralText } } },
    rules: {
      'i18n/no-literal-text': ['error', { allow: UNTRANSLATED_NAMES }],
    },
  },
  {
    files: ['src/analytics/gtag.ts'],
    rules: {
      'prefer-rest-params': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts', 'scripts/**/*.ts', '*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
