import rootConfig from '../../../eslint.config.mjs';
import {
	createPureDomainsBoundaryGuardrail,
	createConfigGuardrail,
	createTestFileConfig
} from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/tenant ESLint 配置
 *
 * 约束等级：L2 (pure-domains)
 * 禁止依赖任何框架实现
 * 禁止直接使用 process.env
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	createPureDomainsBoundaryGuardrail({
		packageName: '@oksai/tenant'
	}),
	createConfigGuardrail({
		packageName: '@oksai/tenant'
	})
];
