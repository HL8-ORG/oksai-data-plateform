import rootConfig from '../../../eslint.config.mjs';
import {
	createSharedFrameworkBoundaryGuardrail,
	createTestFileConfig
} from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/cqrs ESLint 配置
 *
 * 约束等级：L4 (shared-framework)
 *
 * 说明：
 * - CQRS 模块需要依赖 NestJS（CommandBus/QueryBus/装饰器）
 * - 允许使用 class-validator/class-transformer（输入校验）
 * - 但仍禁止依赖领域层
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	createSharedFrameworkBoundaryGuardrail({
		packageName: '@oksai/cqrs'
	})
];
