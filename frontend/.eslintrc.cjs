module.exports = {
  ignorePatterns: ['dist/', 'node_modules/'],
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'no-unused-vars': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off'
  }
};
