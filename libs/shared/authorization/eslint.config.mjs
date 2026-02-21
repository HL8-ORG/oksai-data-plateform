import rootConfig from '../../../eslint.config.mjs';
import {
	createSharedPureBoundaryGuardrail,
	createTestFileConfig
} from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/authorization ESLint 配置
 *
 * 约束等级：L3 (shared-pure)
 * 禁止依赖任何框架
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	createSharedPureBoundaryGuardrail({
		packageName: '@oksai/authorization'
	})
];
