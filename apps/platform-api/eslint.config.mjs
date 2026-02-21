import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';
import { createAppConfigGuardrail, createTestFileConfig } from '../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/platform-api ESLint 配置
 *
 * 应用层入口
 * - 入口文件（main.ts）允许使用 process.env
 * - 其他文件禁止直接使用 process.env
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest
			}
		}
	},
	createAppConfigGuardrail({
		packageName: '@oksai/platform-api',
		entryFiles: ['src/main.ts', 'src/env.ts']
	})
];
