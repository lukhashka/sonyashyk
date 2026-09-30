import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['dist', 'dist-lh', 'dist-e2e', 'playwright-report', 'test-results', 'node_modules', 'supabase/functions', 'scripts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      // Modules must not import each other; only core/ and shared/ (spec §3)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*'],
              message: 'Do not import module internals; use core/ or shared/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['public/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/core/modules/registry.ts', 'src/app/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
