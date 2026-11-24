module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.3' } },
  overrides: [
    {
      files: ['src/**/*.jsx'],
      excludedFiles: ['src/shared/components/search/SearchField.jsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value='search']",
            message: 'Use the shared SearchField component so search styling and accessibility stay consistent.'
          }
        ]
      }
    }
  ],
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^React$|^_' }]
  },
};
