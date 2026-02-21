/**
 * @oksai/config
 *
 * 基于 @nestjs/config 增强的配置管理模块，提供：
 * - 类型安全的配置读取（getInt, getUrl, getDurationMs 等）
 * - zod schema 验证
 * - 命名空间配置分组
 * - 配置缓存
 * - 边界校验（min/max）
 * - Result 类型返回
 * - 中文错误消息
 *
 * @packageDocumentation
 */

// 服务和模块
export {
	ConfigService,
	ConfigModule,
	type ConfigOptions,
	type ConfigModuleOptions,
	type NamespaceDefinition,
	ConfigEnvError,
	ConfigSchemaError,
	env,
	getNamespaceToken
} from './lib/config.service';

// Schema 相关
export { validateConfig, envSchema, type NamespaceConfig } from './lib/config.service';

// 选项类型
export type {
	EnvStringOptions,
	EnvIntOptions,
	EnvFloatOptions,
	EnvBoolOptions,
	EnvEnumOptions,
	EnvUrlOptions,
	EnvJsonOptions,
	EnvListOptions,
	EnvDurationMsOptions
} from './lib/config-env';

// 重导出 zod（方便使用）
export { z } from 'zod';
