import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error'
    }
  },
  {
    files: ['public/**/*.js', 'frontend/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    ignores: [
      'node_modules/**',
      'data/**',
      'logs/**',
      'site/**',
      'playwright-report/**',
      'test-results/**',
      '.vscode/**'
    ]
  }
];
