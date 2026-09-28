import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'node_modules/**', 'coverage/**', 'server/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  },
  {
    files: ['scripts/**/*.{js,mjs}', '**/*.config.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        URL: 'readonly'
      }
    }
  },
  {
    files: ['src/renderer/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },
  {
    files: [
      'src/renderer/src/context/**/*.{ts,tsx}',
      'src/renderer/src/hooks/**/*.{ts,tsx}',
      'src/renderer/src/components/ui/**/*.{ts,tsx}'
    ],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  }
)
