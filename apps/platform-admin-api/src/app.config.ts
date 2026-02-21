/**
 * @description 平台管理 API 应用配置
 *
 * 集中管理应用的环境变量配置，使用 zod schema 验证
 */
import { z } from 'zod';
import {
	DEFAULT_PLATFORM_ADMIN_API_PORT,
	DEFAULT_PLATFORM_ADMIN_API_PREFIX,
	DEFAULT_LOG_LEVEL
} from '@oksai/constants';

/**
 * @description 应用配置 schema
 *
 * 定义所有应用级别的环境变量及其验证规则
 */
export const appConfigSchema = z.object({
	/**
	 * 服务端口
	 */
	ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PLATFORM_ADMIN_API_PORT),

	/**
	 * 运行环境
	 */
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

	/**
	 * API 全局前缀
	 */
	API_PREFIX: z.string().default(DEFAULT_PLATFORM_ADMIN_API_PREFIX),

	/**
	 * 是否启用 Swagger 文档
	 */
	ENABLE_SWAGGER: z
		.string()
		.transform((v) => v === 'true' || v === '1')
		.default('true'),

	/**
	 * 日志级别
	 */
	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default(DEFAULT_LOG_LEVEL),

	/**
	 * 是否启用日志美化（开发环境）
	 */
	PRETTY_LOG: z
		.string()
		.transform((v) => v === 'true' || v === '1')
		.optional()
});

/**
 * @description 应用配置类型
 */
export type AppConfig = z.infer<typeof appConfigSchema>;

/**
 * @description 应用配置接口（业务友好的访问方式）
 */
export interface AppConfiguration {
	/**
	 * 服务端口
	 */
	readonly port: number;

	/**
	 * 运行环境
	 */
	readonly nodeEnv: string;

	/**
	 * 是否为生产环境
	 */
	readonly isProduction: boolean;

	/**
	 * 是否为开发环境
	 */
	readonly isDevelopment: boolean;

	/**
	 * 是否为测试环境
	 */
	readonly isTest: boolean;

	/**
	 * API 全局前缀
	 */
	readonly apiPrefix: string;

	/**
	 * 是否启用 Swagger 文档
	 */
	readonly enableSwagger: boolean;

	/**
	 * 日志级别
	 */
	readonly logLevel: string;

	/**
	 * 是否启用日志美化
	 */
	readonly prettyLog: boolean;
}

/**
 * @description 从验证后的配置创建应用配置对象
 */
export function createAppConfiguration(config: AppConfig): AppConfiguration {
	const isProduction = config.NODE_ENV === 'production';
	const isDevelopment = config.NODE_ENV === 'development';
	const isTest = config.NODE_ENV === 'test';

	return {
		port: config.ADMIN_PORT,
		nodeEnv: config.NODE_ENV,
		isProduction,
		isDevelopment,
		isTest,
		apiPrefix: config.API_PREFIX,
		// 生产环境默认禁用 Swagger
		enableSwagger: config.ENABLE_SWAGGER && !isProduction,
		logLevel: config.LOG_LEVEL,
		// 开发环境默认启用美化日志
		prettyLog: config.PRETTY_LOG ?? isDevelopment
	};
}
