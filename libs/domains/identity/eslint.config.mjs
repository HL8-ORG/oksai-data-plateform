import rootConfig from '../../../eslint.config.mjs';
import {
	createPureDomainsBoundaryGuardrail,
	createTestFileConfig
} from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/identity ESLint 配置
 *
 * 约束等级：L2 (pure-domains)
 * 禁止依赖任何框架实现
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	createPureDomainsBoundaryGuardrail({
		packageName: '@oksai/identity'
	})
];
