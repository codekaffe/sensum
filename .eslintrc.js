module.exports = {
  env: {
    browser: false,
    es6: true,
    node: true,
  },
  extends: ['plugin:@typescript-eslint/eslint-recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'warn',
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-shadow': ['error', { allow: ['_'] }],
    // note you must disable the base rule as it can report incorrect errors
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false,
      },
    ],
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/require-array-sort-compare': 'error',
  },
  ignorePatterns: ['examples/**/*.js'],
};
