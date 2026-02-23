import { FlatCompat } from '@eslint/eslintrc'
 
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})
 
const eslintConfig = [
  {
    ignores: ['src/visual-edits/**'],
  },
  ...compat.config({
    extends: ['next/core-web-vitals'],
  }),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
]
 
export default eslintConfig
