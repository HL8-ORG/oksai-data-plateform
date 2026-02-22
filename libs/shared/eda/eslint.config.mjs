import rootConfig from '../../../eslint.config.mjs';
import {
	createSharedFrameworkBoundaryGuardrail,
	createTestFileConfig
} from '../../../tools/eslint/oksai-guardrails.mjs';

/**
 * @oksai/eda ESLint 配置
 *
 * 约束等级：L4 (shared-framework)
 *
 * 说明：
 * - EDA 模块需要依赖 MikroORM（Outbox/Inbox 数据库操作）
 * - 允许使用 process.env（Worker 配置读取）
 * - 但仍禁止依赖领域层
 */
export default [
	...rootConfig,
	createTestFileConfig(),
	createSharedFrameworkBoundaryGuardrail({
		packageName: '@oksai/eda'
	})
];
