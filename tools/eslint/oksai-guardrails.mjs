/**
 * Oksai ESLint 护栏工具
 *
 * 用于沉淀可复用的边界约束规则，减少各包 eslint.config.mjs 的重复
 *
 * @module oksai-guardrails
 */

// ============ 约束等级定义 ============

/**
 * 约束等级说明
 *
 * L1 - domains: 领域层基础约束，禁止依赖装配层
 * L2 - pure-domains: 严格领域层约束，禁止依赖任何框架
 * L3 - shared-pure: 共享层纯模块，禁止依赖框架和运行时环境
 * L4 - shared-framework: 共享层框架模块，允许依赖框架但禁止依赖领域层
 */

// ============ 禁止导入清单 ============

/**
 * 领域层基础禁止清单（L1）
 *
 * 适用于所有领域模块
 */
export const DOMAINS_BASE_FORBIDDEN_IMPORTS = [
	{
		group: ['@oksai/app-kit', '@oksai/app-kit/*'],
		message: '领域层禁止依赖装配层；请通过 Port/Adapter 模式解耦'
	},
	{
		group: ['@oksai/platform-api-adapters', '@oksai/platform-admin-adapters'],
		message: '领域层禁止依赖应用专属适配器'
	}
];

/**
 * 纯领域层禁止清单（L2）
 *
 * 适用于需要严格 Clean Architecture 的领域模块
 */
export const PURE_DOMAINS_FORBIDDEN_IMPORTS = [
	...DOMAINS_BASE_FORBIDDEN_IMPORTS,
	{
		group: ['@nestjs/*'],
		message: '纯领域层禁止依赖 NestJS 框架；请使用领域服务或 Port 接口'
	},
	{
		group: ['@mikro-orm/*'],
		message: '纯领域层禁止依赖 MikroORM；请使用仓储接口'
	},
	{
		group: ['ioredis', 'kafkajs', 'amqplib'],
		message: '纯领域层禁止依赖基础设施组件'
	},
	{
		group: ['@oksai/logger', '@oksai/config', '@oksai/database', '@oksai/redis', '@oksai/messaging-postgres'],
		message: '纯领域层禁止依赖框架感知的共享模块'
	}
];

/**
 * 共享层纯模块禁止清单（L3）
 *
 * 适用于 kernel、event-store、cqrs、eda、exceptions 等核心模块
 * 
 * 注意：NestJS 核心依赖（@nestjs/common, @nestjs/core, @nestjs/config, @nestjs/platform-fastify）
 * 是项目基座框架，允许全局使用
 */
export const SHARED_PURE_FORBIDDEN_IMPORTS = [
	{
		group: ['@mikro-orm/*'],
		message: '共享层纯模块禁止依赖 MikroORM'
	},
	{
		group: ['ioredis', 'kafkajs', 'amqplib', 'prom-client'],
		message: '共享层纯模块禁止依赖基础设施组件'
	}
];

/**
 * 共享层框架模块禁止清单（L4）
 *
 * 适用于 logger、config、database、redis 等框架感知模块
 */
export const SHARED_FRAMEWORK_FORBIDDEN_IMPORTS = [
	{
		group: ['@oksai/app-kit'],
		message: '共享层禁止依赖装配层'
	},
	{
		group: ['@oksai/identity', '@oksai/tenant', '@oksai/billing'],
		message: '共享层禁止依赖领域模块；请使用事件或通用接口'
	}
];

// ============ 工厂函数 ============

/**
 * 创建领域层边界护栏（L1）
 *
 * @param {object} options - 配置选项
 * @param {string[]} [options.files] - 文件匹配模式
 * @param {object[]} [options.extraForbiddenImports] - 额外的禁止导入
 * @param {string} [options.packageName] - 包名称，用于错误消息
 * @returns {object} ESLint 配置对象
 */
export function createDomainsBoundaryGuardrail(options = {}) {
	const { files = ['src/**/*.ts'], extraForbiddenImports = [], packageName = '领域层' } = options;

	const patterns = [...DOMAINS_BASE_FORBIDDEN_IMPORTS, ...extraForbiddenImports].map((p) => ({
		...p,
		message: `[${packageName}] ${p.message}`
	}));

	return {
		files,
		rules: {
			'no-restricted-imports': ['error', { patterns }]
		}
	};
}

/**
 * 创建纯领域层边界护栏（L2）
 *
 * @param {object} options - 配置选项
 * @param {string[]} [options.files] - 文件匹配模式
 * @param {object[]} [options.extraForbiddenImports] - 额外的禁止导入
 * @param {string} [options.packageName] - 包名称
 * @returns {object} ESLint 配置对象
 */
export function createPureDomainsBoundaryGuardrail(options = {}) {
	const { files = ['src/**/*.ts'], extraForbiddenImports = [], packageName = '纯领域层' } = options;

	const patterns = [...PURE_DOMAINS_FORBIDDEN_IMPORTS, ...extraForbiddenImports].map((p) => ({
		...p,
		message: `[${packageName}] ${p.message}`
	}));

	return {
		files,
		rules: {
			'no-restricted-imports': ['error', { patterns }]
		}
	};
}

/**
 * 创建共享层纯模块边界护栏（L3）
 *
 * @param {object} options - 配置选项
 * @param {string[]} [options.files] - 文件匹配模式
 * @param {object[]} [options.extraForbiddenImports] - 额外的禁止导入
 * @param {string} [options.packageName] - 包名称
 * @param {boolean} [options.forbidProcessEnv] - 是否禁止 process.env
 * @returns {object} ESLint 配置对象
 */
export function createSharedPureBoundaryGuardrail(options = {}) {
	const {
		files = ['src/**/*.ts'],
		extraForbiddenImports = [],
		packageName = '共享层纯模块',
		forbidProcessEnv = true
	} = options;

	const patterns = [...SHARED_PURE_FORBIDDEN_IMPORTS, ...extraForbiddenImports].map((p) => ({
		...p,
		message: `[${packageName}] ${p.message}`
	}));

	const config = {
		files,
		rules: {
			'no-restricted-imports': ['error', { patterns }]
		}
	};

	if (forbidProcessEnv) {
		config.rules['no-restricted-properties'] = [
			'error',
			{
				object: 'process',
				property: 'env',
				message: `[${packageName}] 禁止使用 process.env；请在外层读取并显式注入配置`
			}
		];
	}

	return config;
}

/**
 * 创建共享层框架模块边界护栏（L4）
 *
 * @param {object} options - 配置选项
 * @param {string[]} [options.files] - 文件匹配模式
 * @param {object[]} [options.extraForbiddenImports] - 额外的禁止导入
 * @param {string} [options.packageName] - 包名称
 * @returns {object} ESLint 配置对象
 */
export function createSharedFrameworkBoundaryGuardrail(options = {}) {
	const { files = ['src/**/*.ts'], extraForbiddenImports = [], packageName = '共享层框架模块' } = options;

	const patterns = [...SHARED_FRAMEWORK_FORBIDDEN_IMPORTS, ...extraForbiddenImports].map((p) => ({
		...p,
		message: `[${packageName}] ${p.message}`
	}));

	return {
		files,
		rules: {
			'no-restricted-imports': ['error', { patterns }]
		}
	};
}

// ============ 模块分类 ============

/**
 * 共享层纯模块清单（L3）
 *
 * 这些模块禁止依赖任何框架
 */
export const SHARED_PURE_MODULES = [
	'kernel',
	'event-store',
	'cqrs',
	'eda',
	'exceptions',
	'context',
	'auth',
	'authorization',
	'i18n',
	'aggregate-metadata',
	'analytics',
	'ai-embeddings',
	'constants'
];

/**
 * 共享层框架模块清单（L4）
 *
 * 这些模块允许依赖框架，但禁止依赖领域层
 */
export const SHARED_FRAMEWORK_MODULES = [
	'logger',
	'config',
	'database',
	'redis',
	'messaging',
	'messaging-postgres',
	'plugin'
];

/**
 * 领域模块清单（L2）
 *
 * 这些模块应用严格的 Clean Architecture 约束
 */
export const DOMAIN_MODULES = ['identity', 'tenant', 'billing'];

// ============ 辅助函数 ============

/**
 * 根据包名自动选择合适的护栏
 *
 * @param {string} packageName - 包名（如 '@oksai/kernel'）
 * @param {object} options - 配置选项
 * @returns {object|null} ESLint 配置对象或 null
 */
export function autoSelectGuardrail(packageName, options = {}) {
	const moduleName = packageName.replace('@oksai/', '');

	if (SHARED_PURE_MODULES.includes(moduleName)) {
		return createSharedPureBoundaryGuardrail({ ...options, packageName });
	}

	if (SHARED_FRAMEWORK_MODULES.includes(moduleName)) {
		return createSharedFrameworkBoundaryGuardrail({ ...options, packageName });
	}

	if (DOMAIN_MODULES.includes(moduleName)) {
		return createPureDomainsBoundaryGuardrail({ ...options, packageName });
	}

	return null;
}

/**
 * 创建测试文件配置
 *
 * @param {object} options - 配置选项
 * @param {string[]} [options.testPatterns] - 测试文件匹配模式
 * @returns {object} ESLint 配置对象
 */
export function createTestFileConfig(options = {}) {
	const { testPatterns = ['src/**/*.spec.ts', 'src/**/*.test.ts'] } = options;

	return {
		files: testPatterns,
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	};
}

// ============ 配置防护规则 ============

/**
 * 创建配置防护护栏
 *
 * 禁止直接使用 process.env，强制通过 @oksai/config 模块读取配置
 *
 * @param {object} options - 配置选项
 * @param {string} [options.packageName] - 包名称，用于错误消息
 * @param {string[]} [options.files] - 文件匹配模式
 * @param {string[]} [options.ignorePatterns] - 忽略的文件模式（如配置模块本身）
 * @param {boolean} [options.allowDotenv] - 是否允许 dotenv 导入
 * @returns {object} ESLint 配置对象
 *
 * @example
 * ```javascript
 * // 在 libs/domains/identity/eslint.config.mjs 中
 * import { createConfigGuardrail } from '../../../tools/eslint/oksai-guardrails.mjs';
 *
 * export default [
 *   ...rootConfig,
 *   createConfigGuardrail({ packageName: '@oksai/identity' })
 * ];
 * ```
 */
export function createConfigGuardrail(options = {}) {
	const { packageName = '应用', files = ['src/**/*.ts'], ignorePatterns = [], allowDotenv = false } = options;

	const rules = {
		'no-restricted-properties': [
			'error',
			{
				object: 'process',
				property: 'env',
				message: `[${packageName}] 禁止直接使用 process.env；请使用 @oksai/config 模块的 env 或 ConfigService 读取配置

示例：
  ❌ 错误：const port = process.env.PORT;
  ✅ 正确：import { env } from '@oksai/config';
         const port = env.int('PORT', { defaultValue: 3000 });`
			}
		]
	};

	if (!allowDotenv) {
		rules['no-restricted-imports'] = [
			'error',
			{
				patterns: [
					{
						group: ['dotenv', 'dotenv/config'],
						message: `[${packageName}] 禁止直接使用 dotenv；请通过 @oksai/config 模块管理配置`
					}
				]
			}
		];
	}

	const config = {
		files,
		ignores: ignorePatterns,
		rules
	};

	return config;
}

/**
 * 创建应用层配置防护护栏
 *
 * 适用于 apps/ 目录下的应用，允许在入口文件使用 process.env
 *
 * @param {object} options - 配置选项
 * @param {string} [options.packageName] - 包名称
 * @param {string[]} [options.entryFiles] - 入口文件模式（这些文件允许使用 process.env）
 * @returns {object} ESLint 配置对象
 *
 * @example
 * ```javascript
 * // 在 apps/platform-api/eslint.config.mjs 中
 * import { createAppConfigGuardrail } from '../../../tools/eslint/oksai-guardrails.mjs';
 *
 * export default [
 *   ...rootConfig,
 *   createAppConfigGuardrail({
 *     packageName: '@oksai/platform-api',
 *     entryFiles: ['src/main.ts', 'src/env.ts']
 *   })
 * ];
 * ```
 */
export function createAppConfigGuardrail(options = {}) {
	const { packageName = '应用', entryFiles = [] } = options;

	return {
		files: ['src/**/*.ts'],
		ignores: entryFiles,
		rules: {
			'no-restricted-properties': [
				'error',
				{
					object: 'process',
					property: 'env',
					message: `[${packageName}] 业务代码禁止直接使用 process.env；请在入口文件读取并通过 @oksai/config 管理

入口文件可以读取环境变量，其他文件应使用：
  import { env, ConfigService } from '@oksai/config';`
				}
			],
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['dotenv', 'dotenv/config'],
							message: `[${packageName}] 禁止直接使用 dotenv；请通过 @oksai/config 模块管理配置`
						}
					]
				}
			]
		}
	};
}
