import rootConfig from '../../../eslint.config.mjs';
import {
	createSharedFrameworkBoundaryGuardrail,
	createConfigGuardrail,
	createTestFileConfig
} from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/redis ESLint 配置
 *
 * 约束等级：L4 (shared-framework)
 * 允许依赖框架，禁止依赖领域层
 * 禁止直接使用 process.env
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	createSharedFrameworkBoundaryGuardrail({
		packageName: '@oksai/redis'
	}),
	createConfigGuardrail({
		packageName: '@oksai/redis',
		ignorePatterns: ['src/**/*.spec.ts', 'src/**/*.test.ts']
	})
];
