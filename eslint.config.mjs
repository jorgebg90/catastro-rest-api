import prettier from 'eslint-config-prettier';

import apify from '@apify/eslint-config/ts.js';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

// eslint-disable-next-line import-x/no-default-export
export default [
    { ignores: ['**/dist', 'eslint.config.mjs'] },
    ...apify,
    prettier,
    {
        languageOptions: {
            parser: tsEslint.parser,
            parserOptions: {
                project: 'tsconfig.json',
            },
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        plugins: {
            '@typescript-eslint': tsEslint.plugin,
        },
        rules: {
            'no-console': 0,
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
    {
        files: ['src/domain/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                { patterns: ['apify', 'apify/*', 'fast-xml-parser', 'zod', 'undici', 'msw', 'msw/*', 'crawlee'] },
            ],
        },
    },
    {
        files: ['tests/**/*.ts', 'vitest.config.ts'],
        rules: {
            'import-x/extensions': 'off',
            'import-x/no-extraneous-dependencies': 'off',
            'import-x/no-default-export': 'off',
        },
    },
];
