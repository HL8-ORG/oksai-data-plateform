import rootConfig from '../../../eslint.config.mjs';
import { createTestFileConfig } from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/constants ESLint 配置
 *
 * 纯常量模块，零依赖
 */
export default [
	...rootConfig,
	createTestFileConfig()
];
