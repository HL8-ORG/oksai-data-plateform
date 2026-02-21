import rootConfig from '../../../eslint.config.mjs';
import { createConfigGuardrail, createTestFileConfig } from '../../../tools/eslint/oksai-guardrails.mjs';
import globals from 'globals';

/**
 * @oksai/app-kit ESLint 配置
 *
 * 装配层，负责组合各能力模块
 * 禁止直接使用 process.env，强制使用 @oksai/config
 * 测试文件允许使用 process.env（设置测试环境）
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
	createConfigGuardrail({
		packageName: '@oksai/app-kit',
		ignorePatterns: ['src/**/*.spec.ts', 'src/**/*.test.ts']
	})
];
