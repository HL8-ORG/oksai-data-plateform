import rootConfig from '../../../eslint.config.mjs';
import {
	createSharedFrameworkBoundaryGuardrail,
	createTestFileConfig
} from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/redis ESLint 配置
 *
 * 约束等级：L4 (shared-framework)
 * 允许依赖框架，禁止依赖领域层
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	createSharedFrameworkBoundaryGuardrail({
		packageName: '@oksai/redis'
	})
];
