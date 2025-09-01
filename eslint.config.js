// source: https://discordjs.guide/preparations/setting-up-a-linter.html#setting-up-eslint-rules
const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
        },
        rules: {
            'arrow-spacing': ['warn', { before: true, after: true }],
            'brace-style': 'off',
            'comma-dangle': ['error', 'always-multiline'],
            'comma-spacing': 'error',
            'comma-style': 'error',
            curly: 'off',
            'dot-location': ['error', 'property'],
            'handle-callback-err': 'off',
            indent: ['error', 4], // allow 4 spaces
            'keyword-spacing': 'error',
            'max-nested-callbacks': ['error', { max: 4 }],
            'max-statements-per-line': ['error', { max: 2 }],
            'no-console': 'off',
            'no-empty-function': 'error',
            'no-floating-decimal': 'error',
            'no-inline-comments': 'off', // relaxed
            'no-lonely-if': 'error',
            'no-multi-spaces': 'off', // relaxed
            'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],
            'no-shadow': ['error', { allow: ['err', 'resolve', 'reject'] }],
            'no-trailing-spaces': ['warn'], // less strict
            'no-var': 'error',
            'no-undef': 'off',
            'object-curly-spacing': ['error', 'always'],
            'prefer-const': 'error',
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'space-before-blocks': 'error',
            'space-before-function-paren': ['error', {
                anonymous: 'never',
                named: 'never',
                asyncArrow: 'always',
            }],
            'space-in-parens': 'off', // relaxed
            'space-infix-ops': 'off', // relaxed
            'space-unary-ops': 'off', // relaxed
            'spaced-comment': 'off', // relaxed
            yoda: 'error',
        },
    },
];
