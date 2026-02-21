import { Result } from '@oksai/kernel';

/**
 * 配置验证函数类型
 */
export type ConfigValidator<T = unknown> = (value: unknown) => Result<T, string>;

/**
 * 配置选项
 */
export interface ConfigOptions {
	/**
	 * 是否启用缓存
	 * @default true
	 */
	enableCache?: boolean;
}

/**
 * 配置服务
 *
 * 提供环境变量和配置的访问接口，支持：
 * - 类型安全的配置读取
 * - 配置缓存
 * - 必需配置验证
 * - JSON 配置解析
 *
 * @example
 * ```typescript
 * const config = new ConfigService();
 *
 * // 获取配置
 * const dbUrl = config.getRequired('DATABASE_URL');
 * const port = config.getNumber('PORT', 3000);
 * const debug = config.getBoolean('DEBUG', false);
 *
 * // 检查环境
 * if (config.isProduction()) {
 *   // 生产环境逻辑
 * }
 *
 * // 解析 JSON 配置
 * const features = config.getJson<string[]>('FEATURES', []);
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
	 * 获取配置值
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 配置值或默认值
	 */
	public get(key: string, defaultValue?: string): string | undefined {
		if (this.enableCache && this.cache.has(key)) {
			return this.cache.get(key) as string | undefined;
		}

		const value = process.env[key] ?? defaultValue;
		if (this.enableCache) {
			this.cache.set(key, value);
		}
		return value;
	}

	/**
	 * 获取必需的配置值
	 *
	 * @param key - 配置键名
	 * @returns 配置值
	 * @throws Error 如果配置不存在
	 */
	public getRequired(key: string): string {
		const value = this.get(key);
		if (value === undefined) {
			throw new Error(`配置项 ${key} 是必需的，但未设置`);
		}
		return value;
	}

	/**
	 * 获取数字类型的配置值
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 数字类型的配置值
	 */
	public getNumber(key: string, defaultValue?: number): number {
		const cacheKey = `number:${key}`;
		if (this.enableCache && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey) as number;
		}

		const value = process.env[key];
		let result: number;

		if (value === undefined) {
			if (defaultValue !== undefined) {
				result = defaultValue;
			} else {
				result = NaN;
			}
		} else {
			const parsed = Number(value);
			result = Number.isNaN(parsed) ? NaN : parsed;
		}

		if (this.enableCache) {
			this.cache.set(cacheKey, result);
		}
		return result;
	}

	/**
	 * 安全获取数字类型的配置值
	 *
	 * 返回 Result 类型，避免 NaN 导致的运行时错误
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns Result<number, string>
	 *
	 * @example
	 * ```typescript
	 * const result = config.getSafeNumber('PORT', 3000);
	 * if (result.isOk()) {
	 *   console.log(result.value); // number
	 * } else {
	 *   console.error(result.error); // string
	 * }
	 * ```
	 */
	public getSafeNumber(key: string, defaultValue?: number): Result<number, string> {
		const value = process.env[key];

		if (value === undefined) {
			if (defaultValue !== undefined) {
				return Result.ok(defaultValue);
			}
			return Result.fail(`配置项 ${key} 未设置且无默认值`);
		}

		const parsed = Number(value);
		if (Number.isNaN(parsed)) {
			return Result.fail(`配置项 ${key} 不是有效的数字: ${value}`);
		}

		return Result.ok(parsed);
	}

	/**
	 * 获取整数类型的配置值
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 整数类型的配置值
	 */
	public getInt(key: string, defaultValue?: number): number {
		const num = this.getNumber(key, defaultValue);
		return Number.isNaN(num) ? NaN : Math.trunc(num);
	}

	/**
	 * 获取浮点数类型的配置值
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 浮点数类型的配置值
	 */
	public getFloat(key: string, defaultValue?: number): number {
		return this.getNumber(key, defaultValue);
	}

	/**
	 * 获取布尔类型的配置值
	 *
	 * 识别 'true' (不区分大小写) 为 true，其他值为 false
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 布尔类型的配置值
	 */
	public getBoolean(key: string, defaultValue?: boolean): boolean {
		const cacheKey = `boolean:${key}`;
		if (this.enableCache && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey) as boolean;
		}

		const value = process.env[key];
		let result: boolean;

		if (value === undefined) {
			result = defaultValue ?? false;
		} else {
			result = value.toLowerCase() === 'true';
		}

		if (this.enableCache) {
			this.cache.set(cacheKey, result);
		}
		return result;
	}

	/**
	 * 获取 JSON 类型的配置值
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 解析后的 JSON 对象或默认值
	 *
	 * @example
	 * ```typescript
	 * // 环境变量: ALLOWED_ORIGINS='["http://localhost:3000","https://example.com"]'
	 * const origins = config.getJson<string[]>('ALLOWED_ORIGINS', []);
	 * ```
	 */
	public getJson<T>(key: string, defaultValue: T): T {
		const cacheKey = `json:${key}`;
		if (this.enableCache && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey) as T;
		}

		const value = process.env[key];
		let result: T;

		if (value === undefined) {
			result = defaultValue;
		} else {
			try {
				result = JSON.parse(value) as T;
			} catch {
				result = defaultValue;
			}
		}

		if (this.enableCache) {
			this.cache.set(cacheKey, result);
		}
		return result;
	}

	/**
	 * 安全获取 JSON 类型的配置值
	 *
	 * @param key - 配置键名
	 * @returns Result<T, string>
	 */
	public getSafeJson<T>(key: string): Result<T, string> {
		const value = process.env[key];

		if (value === undefined) {
			return Result.fail(`配置项 ${key} 未设置`);
		}

		try {
			const parsed = JSON.parse(value) as T;
			return Result.ok(parsed);
		} catch (error) {
			return Result.fail(`配置项 ${key} 不是有效的 JSON: ${(error as Error).message}`);
		}
	}

	/**
	 * 获取枚举类型的配置值
	 *
	 * @param key - 配置键名
	 * @param enumValues - 允许的枚举值数组
	 * @param defaultValue - 默认值
	 * @returns 枚举值或默认值
	 *
	 * @example
	 * ```typescript
	 * const logLevel = config.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info');
	 * ```
	 */
	public getEnum<T extends string>(key: string, enumValues: T[], defaultValue: T): T {
		const cacheKey = `enum:${key}`;
		if (this.enableCache && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey) as T;
		}

		const value = process.env[key] as T;
		const result = enumValues.includes(value) ? value : defaultValue;

		if (this.enableCache) {
			this.cache.set(cacheKey, result);
		}
		return result;
	}

	/**
	 * 获取 Node 环境标识
	 *
	 * @returns Node 环境标识（development/test/production）
	 */
	public getNodeEnv(): string {
		return this.get('NODE_ENV', 'development')!;
	}

	/**
	 * 检查是否为生产环境
	 *
	 * @returns 如果是生产环境返回 true
	 */
	public isProduction(): boolean {
		return this.getNodeEnv() === 'production';
	}

	/**
	 * 检查是否为开发环境
	 *
	 * @returns 如果是开发环境返回 true
	 */
	public isDevelopment(): boolean {
		return this.getNodeEnv() === 'development';
	}

	/**
	 * 检查是否为测试环境
	 *
	 * @returns 如果是测试环境返回 true
	 */
	public isTest(): boolean {
		return this.getNodeEnv() === 'test';
	}

	/**
	 * 清除缓存
	 */
	public clearCache(): void {
		this.cache.clear();
	}

	/**
	 * 清除指定 key 的缓存
	 *
	 * @param key - 配置键名
	 */
	public clearCacheFor(key: string): void {
		this.cache.delete(key);
		this.cache.delete(`number:${key}`);
		this.cache.delete(`boolean:${key}`);
		this.cache.delete(`json:${key}`);
		this.cache.delete(`enum:${key}`);
	}
}

/**
 * 配置模块选项
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
 * 配置模块
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
	 * 创建配置模块
	 *
	 * @param options - 模块选项
	 * @returns 模块配置
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
	 * 创建异步配置模块
	 *
	 * @param options - 异步模块选项
	 * @returns 模块配置
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
