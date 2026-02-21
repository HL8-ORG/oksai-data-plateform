import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * Oksai ESLint 根配置
 *
 * 职责：
 * - 提供全仓默认基线（不依赖类型信息）
 * - Prettier 集成
 * - 全局忽略项
 *
 * 子项目需显式 import 此配置并扩展
 */
export default tseslint.config(
	{
		ignores: [
			'dist/**',
			'tmp/**',
			'coverage/**',
			'node_modules/**',
			'*.js',
			'*.d.ts',
			'!.eslintrc.js',
			'!jest.config.js'
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module'
			},
			globals: {
				...globals.node,
				...globals.es2021,
				...globals.jest
			}
		},
		plugins: {
			prettier: prettier
		},
		rules: {
			...eslintConfigPrettier.rules,
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'none',
					caughtErrors: 'none',
					varsIgnorePattern: '^_',
					argsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'no-console': 'off',
			'prettier/prettier': 'error'
		}
	}
);
