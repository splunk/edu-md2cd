import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-constant-condition': 'warn',
            'no-debugger': 'error',
            'no-duplicate-imports': 'error',
            'prefer-const': 'error',
        },
    },
    {
        ignores: ['node_modules/', 'dist/', 'tests/fixtures/'],
    },
];
