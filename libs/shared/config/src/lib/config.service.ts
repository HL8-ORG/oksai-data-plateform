import { Result } from '@oksai/kernel';
import {
	env,
	ConfigEnvError,
	EnvStringOptions,
	EnvIntOptions,
	EnvFloatOptions,
	EnvBoolOptions,
	EnvEnumOptions,
	EnvUrlOptions,
	EnvJsonOptions,
	EnvListOptions,
	EnvDurationMsOptions
} from './config-env';

/**
 * @description 配置服务选项
 */
export interface ConfigOptions {
	/**
	 * 是否启用缓存
	 * @default true
	 */
	enableCache?: boolean;
}

/**
 * @description 配置服务
 *
 * 提供环境变量和配置的访问接口，支持：
 * - 类型安全的配置读取
 * - 配置缓存
 * - 边界校验（min/max）
 * - Result 类型返回（可选场景）
 *
 * @example
 * ```typescript
 * const config = new ConfigService();
 *
 * // 基本读取
 * const dbUrl = config.getRequired('DATABASE_URL');
 * const port = config.getInt('PORT', { defaultValue: 3000, min: 1, max: 65535 });
 * const debug = config.getBool('DEBUG', { defaultValue: false });
 *
 * // 高级类型
 * const origins = config.getList('ALLOWED_ORIGINS');
 * const timeout = config.getDurationMs('TIMEOUT', { defaultValue: 5000, min: 1000 });
 *
 * // 安全读取
 * const result = config.getSafeInt('PORT');
 * if (result.isOk()) {
 *   console.log(result.value);
 * }
 * ```
 */
export class ConfigService {
	/**
	 * 配置缓存
	 * @private
	 */
	private readonly cache: Map<string, unknown> = new Map();

	/**
	 * 是否启用缓存
	 * @private
	 */
	private readonly enableCache: boolean;

	constructor(options: ConfigOptions = {}) {
		this.enableCache = options.enableCache ?? true;
	}

	/**
	 * @description 获取缓存 key
	 * @private
	 */
	private getCacheKey(type: string, key: string): string {
		return `${type}:${key}`;
	}

	/**
	 * @description 从缓存获取或计算值
	 * @private
	 */
	private getOrCompute<T>(cacheKey: string, compute: () => T): T {
		if (this.enableCache && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey) as T;
		}
		const value = compute();
		if (this.enableCache) {
			this.cache.set(cacheKey, value);
		}
		return value;
	}

	// ============ 字符串方法 ============

	/**
	 * @description 获取字符串配置
	 */
	get(name: string, options: EnvStringOptions = {}): string | undefined {
		const cacheKey = this.getCacheKey('string', name);
		return this.getOrCompute(cacheKey, () => {
			try {
				return env.string(name, options);
			} catch {
				return options.defaultValue;
			}
		});
	}

	/**
	 * @description 获取必需的字符串配置
	 */
	getRequired(name: string): string {
		return env.string(name);
	}

	// ============ 数字方法 ============

	/**
	 * @description 获取整数配置
	 */
	getInt(name: string, options: EnvIntOptions = {}): number {
		const cacheKey = this.getCacheKey('int', name);
		return this.getOrCompute(cacheKey, () => env.int(name, options));
	}

	/**
	 * @description 获取浮点数配置
	 */
	getFloat(name: string, options: EnvFloatOptions = {}): number {
		const cacheKey = this.getCacheKey('float', name);
		return this.getOrCompute(cacheKey, () => env.float(name, options));
	}

	/**
	 * @description 获取数字配置（兼容旧 API）
	 */
	getNumber(name: string, defaultValue?: number): number {
		return this.getInt(name, { defaultValue });
	}

	/**
	 * @deprecated 使用 getInt 代替
	 */
	getSafeNumber(name: string, defaultValue?: number): Result<number, string> {
		return env.getSafeInt(name, { defaultValue });
	}

	// ============ 布尔方法 ============

	/**
	 * @description 获取布尔配置
	 */
	getBool(name: string, options: EnvBoolOptions = {}): boolean {
		const cacheKey = this.getCacheKey('bool', name);
		return this.getOrCompute(cacheKey, () => env.bool(name, options));
	}

	/**
	 * @description 获取布尔配置（兼容旧 API）
	 */
	getBoolean(name: string, defaultValue?: boolean): boolean {
		return this.getBool(name, { defaultValue });
	}

	// ============ 枚举方法 ============

	/**
	 * @description 获取枚举配置
	 */
	getEnum<T extends string>(name: string, allowed: T[], options: EnvEnumOptions<T> = {}): T {
		const cacheKey = this.getCacheKey('enum', name);
		return this.getOrCompute(cacheKey, () => {
			try {
				return env.enum(name, allowed as readonly T[], options);
			} catch {
				if (options.defaultValue !== undefined) {
					return options.defaultValue;
				}
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
		});
	}

	// ============ URL 方法 ============

	/**
	 * @description 获取 URL 配置
	 */
	getUrl(name: string, options: EnvUrlOptions = {}): string {
		const cacheKey = this.getCacheKey('url', name);
		return this.getOrCompute(cacheKey, () => {
			try {
				return env.url(name, options);
			} catch (e) {
				if (e instanceof ConfigEnvError && e.message.includes('缺少必需的环境变量')) {
					if (options.defaultValue !== undefined) {
						return options.defaultValue;
					}
				}
				throw e;
			}
		});
	}

	// ============ JSON 方法 ============

	/**
	 * @description 获取 JSON 配置
	 */
	getJson<T>(name: string, options: EnvJsonOptions<T> = {}): T {
		const cacheKey = this.getCacheKey('json', name);
		return this.getOrCompute(cacheKey, () => {
			try {
				return env.json(name, options);
			} catch {
				if (options.defaultValue !== undefined) {
					return options.defaultValue;
				}
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
		});
	}

	/**
	 * @description 安全获取 JSON 配置
	 */
	getSafeJson<T>(name: string, options: EnvJsonOptions<T> = {}): Result<T, string> {
		return env.getSafeJson(name, options);
	}

	// ============ 列表方法 ============

	/**
	 * @description 获取列表配置
	 */
	getList(name: string, options: EnvListOptions = {}): string[] {
		const cacheKey = this.getCacheKey('list', name);
		return this.getOrCompute(cacheKey, () => env.list(name, options));
	}

	// ============ 时长方法 ============

	/**
	 * @description 获取时长配置（毫秒）
	 */
	getDurationMs(name: string, options: EnvDurationMsOptions = {}): number {
		const cacheKey = this.getCacheKey('durationMs', name);
		return this.getOrCompute(cacheKey, () => env.durationMs(name, options));
	}

	// ============ 环境检测 ============

	/**
	 * @description 获取 Node 环境标识
	 */
	getNodeEnv(): string {
		return this.get('NODE_ENV') ?? 'development';
	}

	/**
	 * @description 检查是否为生产环境
	 */
	isProduction(): boolean {
		return this.getNodeEnv() === 'production';
	}

	/**
	 * @description 检查是否为开发环境
	 */
	isDevelopment(): boolean {
		return this.getNodeEnv() === 'development';
	}

	/**
	 * @description 检查是否为测试环境
	 */
	isTest(): boolean {
		return this.getNodeEnv() === 'test';
	}

	// ============ 缓存控制 ============

	/**
	 * @description 清除所有缓存
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * @description 清除指定 key 的缓存
	 */
	clearCacheFor(name: string): void {
		const types = ['string', 'int', 'float', 'bool', 'enum', 'url', 'json', 'list', 'durationMs'];
		for (const type of types) {
			this.cache.delete(this.getCacheKey(type, name));
		}
	}
}

// ============ NestJS 模块 ============

/**
 * @description 配置模块选项
 */
export interface ConfigModuleOptions {
	/**
	 * 是否全局模块
	 * @default true
	 */
	isGlobal?: boolean;

	/**
	 * 配置服务选项
	 */
	configOptions?: ConfigOptions;
}

/**
 * @description 配置模块
 *
 * NestJS 模块，提供配置服务的依赖注入。
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [ConfigModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 */
export class ConfigModule {
	/**
	 * @description 创建配置模块
	 */
	public static forRoot(options: ConfigModuleOptions = {}) {
		const configService = new ConfigService(options.configOptions);

		return {
			module: ConfigModule,
			global: options.isGlobal ?? true,
			providers: [
				{
					provide: ConfigService,
					useValue: configService
				}
			],
			exports: [ConfigService]
		};
	}

	/**
	 * @description 创建异步配置模块
	 */
	public static forRootAsync(options: {
		useFactory: (...args: unknown[]) => Promise<ConfigOptions> | ConfigOptions;
		inject?: unknown[];
		isGlobal?: boolean;
	}) {
		return {
			module: ConfigModule,
			global: options.isGlobal ?? true,
			providers: [
				{
					provide: ConfigService,
					useFactory: async (...args: unknown[]) => {
						const configOptions = await options.useFactory(...args);
						return new ConfigService(configOptions);
					},
					inject: options.inject ?? []
				}
			],
			exports: [ConfigService]
		};
	}
}

// 重导出
export { env, ConfigEnvError };
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
};
