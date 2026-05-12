module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react', 'react-hooks'],
  rules: {
    // --- Code Quality ---
    'no-console': ['warn', { allow: ['warn', 'error'] }], // Allow warn/error, flag log() in prod
    'no-unused-vars': 'off',                               // Handled by TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',           // Too many legacy any — to tighten later

    // --- React ---
    'react/prop-types': 'off',                             // Using TypeScript instead
    'react/react-in-jsx-scope': 'off',                     // Not needed in React 17+
    'react-hooks/rules-of-hooks': 'error',                 // Critical: enforce hooks rules
    'react-hooks/exhaustive-deps': 'warn',                 // Warn on missing deps in useEffect

    // --- React Native Specific ---
    'no-restricted-syntax': [
      'warn',
      {
        // Warn against empty catch blocks
        selector: 'CatchClause[param=null] > BlockStatement:empty',
        message: 'Avoid empty catch blocks. At minimum log the error.',
      },
    ],
  },
  env: {
    browser: false,
    node: true,
    es2021: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', 'dist-i18n/'],
};
