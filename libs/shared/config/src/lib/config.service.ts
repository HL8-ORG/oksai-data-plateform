import { Injectable, Module, type OnModuleDestroy, type Provider, type DynamicModule } from '@nestjs/common';
import {
	ConfigService as NestConfigService,
	ConfigModule as NestConfigModule,
	type ConfigModuleOptions as NestConfigModuleOptions
} from '@nestjs/config';
import { z } from 'zod';
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
import { validateConfig, ConfigSchemaError, type NamespaceConfig } from './config-schema';

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
 * @description 命名空间配置接口
 */
export interface NamespaceConfigFactory<T extends NamespaceConfig> {
	/**
	 * @description 创建命名空间配置
	 */
	create(): T;
}

/**
 * @description 配置服务的 NestJS 注入 Token
 */
export const CONFIG_SERVICE_TOKEN = 'CONFIG_SERVICE';

/**
 * @description 增强版配置服务
 *
 * 基于 @nestjs/config 增强的配置服务，提供：
 * - 类型安全的配置读取（getInt, getUrl, getDurationMs 等）
 * - 命名空间配置分组
 * - zod schema 验证
 * - 配置缓存
 * - 边界校验（min/max）
 * - Result 类型返回（可选场景）
 * - 中文错误消息
 *
 * @example
 * ```typescript
 * // 基本使用
 * const config = app.get(ConfigService);
 * const dbUrl = config.getRequired('DATABASE_URL');
 * const port = config.getInt('PORT', { defaultValue: 3000, min: 1, max: 65535 });
 *
 * // 命名空间配置
 * const dbConfig = config.getNamespace<DatabaseConfig>('database');
 *
 * // schema 验证
 * const validatedConfig = config.validate(schema);
 * ```
 */
@Injectable()
export class ConfigService implements OnModuleDestroy {
	/**
	 * 配置缓存
	 * @private
	 */
	private readonly cache: Map<string, unknown> = new Map();

	/**
	 * 命名空间配置缓存
	 * @private
	 */
	private readonly namespaceCache: Map<string, NamespaceConfig> = new Map();

	/**
	 * 是否启用缓存
	 * @private
	 */
	private readonly enableCache: boolean;

	/**
	 * NestJS 配置服务实例
	 * @private
	 */
	private nestConfigService: NestConfigService | null = null;

	constructor(options: ConfigOptions = {}) {
		this.enableCache = options.enableCache ?? true;
	}

	/**
	 * @description 设置 NestJS 配置服务实例（内部使用）
	 * @internal
	 */
	setNestConfigService(service: NestConfigService): void {
		this.nestConfigService = service;
	}

	/**
	 * @description 模块销毁时清理缓存
	 */
	onModuleDestroy(): void {
		this.clearCache();
		this.namespaceCache.clear();
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

	/**
	 * @description 从 NestJS 配置服务或环境变量获取值
	 * @private
	 */
	private getRawValue(key: string): string | undefined {
		if (this.nestConfigService) {
			const value = this.nestConfigService.get<string>(key);
			if (value !== undefined) {
				return value;
			}
		}
		return process.env[key];
	}

	// ============ 基础方法（兼容 @nestjs/config API） ============

	/**
	 * @description 获取配置值（兼容 @nestjs/config API）
	 *
	 * @param key 配置键名
	 * @returns 配置值，不存在时返回 undefined
	 */
	get<T = string>(key: string): T | undefined;
	get<T = string>(key: string, options: EnvStringOptions): T | undefined;
	get<T = string>(key: string, options?: EnvStringOptions): T | undefined {
		const cacheKey = this.getCacheKey('string', key);
		return this.getOrCompute(cacheKey, () => {
			try {
				const raw = this.getRawValue(key);
				if (raw === undefined || raw === '') {
					return options?.defaultValue as T | undefined;
				}
				const v = options?.trim === false ? raw : raw.trim();
				if (v.length === 0) {
					return options?.defaultValue as T | undefined;
				}
				return v as T;
			} catch {
				return options?.defaultValue as T | undefined;
			}
		});
	}

	/**
	 * @description 获取必需的配置值
	 *
	 * @param key 配置键名
	 * @returns 配置值
	 * @throws ConfigEnvError 配置不存在时抛出
	 */
	getOrThrow<T = string>(key: string): T {
		const value = this.get<T>(key);
		if (value === undefined) {
			throw new ConfigEnvError(`缺少必需的环境变量：${key}`);
		}
		return value;
	}

	/**
	 * @description 获取必需的字符串配置（兼容旧 API）
	 */
	getRequired(name: string): string {
		const value = this.get<string>(name);
		if (value === undefined || value === '') {
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		return value;
	}

	// ============ 数字方法 ============

	/**
	 * @description 获取整数配置
	 */
	getInt(name: string, options: EnvIntOptions = {}): number {
		const cacheKey = this.getCacheKey('int', name);
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			const n = Number.parseInt(raw, 10);
			if (Number.isNaN(n)) {
				throw new ConfigEnvError(`环境变量 ${name} 不是有效整数：${raw}`);
			}
			if (options.min !== undefined && n < options.min) {
				throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}：${n}`);
			}
			if (options.max !== undefined && n > options.max) {
				throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}：${n}`);
			}
			return n;
		});
	}

	/**
	 * @description 获取浮点数配置
	 */
	getFloat(name: string, options: EnvFloatOptions = {}): number {
		const cacheKey = this.getCacheKey('float', name);
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			const n = Number.parseFloat(raw);
			if (Number.isNaN(n)) {
				throw new ConfigEnvError(`环境变量 ${name} 不是有效浮点数：${raw}`);
			}
			if (options.min !== undefined && n < options.min) {
				throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}：${n}`);
			}
			if (options.max !== undefined && n > options.max) {
				throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}：${n}`);
			}
			return n;
		});
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
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			const v = raw.trim().toLowerCase();
			if (v === 'true' || v === '1') return true;
			if (v === 'false' || v === '0') return false;
			throw new ConfigEnvError(`环境变量 ${name} 不是有效布尔值（true/false/1/0）：${raw}`);
		});
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
	getEnum<T extends string>(name: string, allowed: readonly T[], options: EnvEnumOptions<T> = {}): T {
		const cacheKey = this.getCacheKey('enum', name);
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			const v = raw.trim();
			if ((allowed as readonly string[]).includes(v)) return v as T;
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(
				`环境变量 ${name} 的值不合法：${v}，允许值为：${(allowed as readonly string[]).join(', ')}`
			);
		});
	}

	// ============ URL 方法 ============

	/**
	 * @description 获取 URL 配置
	 */
	getUrl(name: string, options: EnvUrlOptions = {}): string {
		const cacheKey = this.getCacheKey('url', name);
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			const v = raw.trim();
			let u: URL;
			try {
				u = new URL(v);
			} catch {
				throw new ConfigEnvError(`环境变量 ${name} 不是有效 URL：${v}`);
			}
			if (options.allowedProtocols?.length) {
				if (!options.allowedProtocols.includes(u.protocol)) {
					throw new ConfigEnvError(
						`环境变量 ${name} 的协议不被允许：${u.protocol}，允许协议：${options.allowedProtocols.join(', ')}`
					);
				}
			}
			return v;
		});
	}

	// ============ JSON 方法 ============

	/**
	 * @description 获取 JSON 配置
	 */
	getJson<T>(name: string, options: EnvJsonOptions<T> = {}): T {
		const cacheKey = this.getCacheKey('json', name);
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			try {
				return JSON.parse(raw) as T;
			} catch {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`环境变量 ${name} 不是有效 JSON：${raw}`);
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
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			const sep = options.separator ?? ',';
			const trim = options.trim ?? true;
			return raw
				.split(sep)
				.map((s) => (trim ? s.trim() : s))
				.filter((s) => s.length > 0);
		});
	}

	// ============ 时长方法 ============

	/**
	 * @description 获取时长配置（毫秒）
	 */
	getDurationMs(name: string, options: EnvDurationMsOptions = {}): number {
		const cacheKey = this.getCacheKey('durationMs', name);
		return this.getOrCompute(cacheKey, () => {
			const raw = this.getRawValue(name);
			if (raw === undefined || raw === '') {
				if (options.defaultValue !== undefined) return options.defaultValue;
				throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
			}
			const v = raw.trim().toLowerCase();
			const m = /^(\d+)(ms|s|m|h|d)?$/.exec(v);
			if (!m) throw new ConfigEnvError(`环境变量 ${name} 不是有效时长：${raw}（示例：1500/2s/5m/1h/1d）`);
			const n = Number.parseInt(m[1] ?? '', 10);
			const unit = m[2] ?? 'ms';
			const ms =
				unit === 'ms'
					? n
					: unit === 's'
						? n * 1000
						: unit === 'm'
							? n * 60_000
							: unit === 'h'
								? n * 3_600_000
								: n * 86_400_000;

			if (options.min !== undefined && ms < options.min)
				throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}ms：${ms}`);
			if (options.max !== undefined && ms > options.max)
				throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}ms：${ms}`);
			return ms;
		});
	}

	// ============ 命名空间配置 ============

	/**
	 * @description 注册命名空间配置
	 *
	 * @param namespace 命名空间名称
	 * @param factory 配置工厂函数
	 * @returns 配置对象
	 *
	 * @example
	 * ```typescript
	 * interface DatabaseConfig {
	 *   host: string;
	 *   port: number;
	 * }
	 *
	 * const dbConfig = config.registerNamespace<DatabaseConfig>('database', () => ({
	 *   host: config.getRequired('DB_HOST'),
	 *   port: config.getInt('DB_PORT', { defaultValue: 5432 }),
	 * }));
	 * ```
	 */
	registerNamespace<T extends NamespaceConfig>(namespace: string, factory: () => T): T {
		if (this.enableCache && this.namespaceCache.has(namespace)) {
			return this.namespaceCache.get(namespace) as T;
		}
		const config = factory();
		if (this.enableCache) {
			this.namespaceCache.set(namespace, config);
		}
		return config;
	}

	/**
	 * @description 获取命名空间配置
	 *
	 * @param namespace 命名空间名称
	 * @returns 配置对象，不存在时返回 undefined
	 */
	getNamespace<T extends NamespaceConfig>(namespace: string): T | undefined {
		return this.namespaceCache.get(namespace) as T | undefined;
	}

	/**
	 * @description 获取或创建命名空间配置
	 *
	 * @param namespace 命名空间名称
	 * @param factory 配置工厂函数
	 * @returns 配置对象
	 */
	getOrCreateNamespace<T extends NamespaceConfig>(namespace: string, factory: () => T): T {
		if (this.namespaceCache.has(namespace)) {
			return this.namespaceCache.get(namespace) as T;
		}
		return this.registerNamespace(namespace, factory);
	}

	// ============ Schema 验证 ============

	/**
	 * @description 使用 zod schema 验证配置
	 *
	 * @param schema zod schema
	 * @returns 验证后的配置
	 * @throws ConfigSchemaError 验证失败时抛出
	 *
	 * @example
	 * ```typescript
	 * const appConfigSchema = z.object({
	 *   port: z.coerce.number().int().min(1).max(65535),
	 *   nodeEnv: z.enum(['development', 'production', 'test']),
	 * });
	 *
	 * const config = configService.validate(appConfigSchema);
	 * ```
	 */
	validate<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
		const rawConfig: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(process.env)) {
			if (value !== undefined) {
				rawConfig[key] = value;
			}
		}

		if (this.nestConfigService) {
			const internalConfig = (this.nestConfigService as unknown as { internalConfig?: Record<string, unknown> })
				.internalConfig;
			if (internalConfig) {
				Object.assign(rawConfig, internalConfig);
			}
		}

		return validateConfig(schema, rawConfig);
	}

	/**
	 * @description 安全验证配置（返回 Result 类型）
	 */
	safeValidate<T extends z.ZodTypeAny>(schema: T): Result<z.infer<T>, string> {
		try {
			const config = this.validate(schema);
			return Result.ok(config);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return Result.fail(message);
		}
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

	/**
	 * @description 清除命名空间缓存
	 */
	clearNamespaceCache(namespace?: string): void {
		if (namespace) {
			this.namespaceCache.delete(namespace);
		} else {
			this.namespaceCache.clear();
		}
	}
}

// ============ 配置模块选项 ============

/**
 * @description 命名空间配置定义
 */
export interface NamespaceDefinition<T extends NamespaceConfig = NamespaceConfig> {
	/**
	 * 命名空间名称
	 */
	name: string;

	/**
	 * 配置工厂函数
	 */
	factory: (config: ConfigService) => T;

	/**
	 * zod schema（可选）
	 */
	schema?: z.ZodType<T>;
}

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

	/**
	 * 是否忽略 .env 文件
	 * @default false
	 */
	ignoreEnvFile?: boolean;

	/**
	 * .env 文件路径
	 */
	envFilePath?: string | string[];

	/**
	 * 环境变量前缀
	 */
	envPrefix?: string;

	/**
	 * 命名空间配置定义列表
	 */
	namespaces?: NamespaceDefinition[];

	/**
	 * zod schema（用于验证整个配置）
	 */
	schema?: z.ZodTypeAny;

	/**
	 * 配置加载函数
	 */
	load?: Array<() => Record<string, unknown>>;

	/**
	 * 是否在验证失败时抛出异常
	 * @default true
	 */
	validationOptions?: {
		/**
		 * 是否在验证失败时抛出异常
		 * @default true
		 */
		abortEarly?: boolean;
	};
}

// ============ 配置模块 ============

/**
 * @description 增强版配置模块
 *
 * 基于 @nestjs/config 增强的配置模块，提供：
 * - zod schema 验证
 * - 命名空间配置
 * - 类型安全访问
 * - 中文错误消息
 *
 * @example
 * ```typescript
 * // 基本使用
 * @Module({
 *   imports: [ConfigModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // 带 schema 验证
 * const appSchema = z.object({
 *   PORT: z.coerce.number().int().min(1).max(65535).default(3000),
 *   NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
 * });
 *
 * @Module({
 *   imports: [ConfigModule.forRoot({ schema: appSchema })],
 * })
 * export class AppModule {}
 *
 * // 带命名空间配置
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot({
 *       namespaces: [
 *         {
 *           name: 'database',
 *           factory: (config) => ({
 *             host: config.getRequired('DB_HOST'),
 *             port: config.getInt('DB_PORT', { defaultValue: 5432 }),
 *           }),
 *         },
 *       ],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class ConfigModule {
	/**
	 * @description 创建配置模块（适配 @nestjs/config v4 async API）
	 *
	 * 注意：@nestjs/config v4 的 forRoot 是异步的，需要在 imports 中 await
	 *
	 * @example
	 * ```typescript
	 * // 在 main.ts 或模块初始化时
	 * @Module({
	 *   imports: [await ConfigModule.forRoot()],
	 * })
	 * export class AppModule {}
	 *
	 * // 或者使用 forRootSync（同步版本，用于简单场景）
	 * @Module({
	 *   imports: [ConfigModule.forRootSync()],
	 * })
	 * export class AppModule {}
	 * ```
	 */
	public static async forRoot(options: ConfigModuleOptions = {}): Promise<DynamicModule> {
		const configService = new ConfigService(options.configOptions);

		const nestConfigOptions: NestConfigModuleOptions = {
			isGlobal: options.isGlobal ?? true,
			ignoreEnvFile: options.ignoreEnvFile,
			envFilePath: options.envFilePath,
			load: options.load,
			cache: options.configOptions?.enableCache ?? true
		};

		const nestModule = await NestConfigModule.forRoot(nestConfigOptions);

		const providers: Provider[] = [
			{
				provide: ConfigService,
				useFactory: (nestConfig: NestConfigService) => {
					configService.setNestConfigService(nestConfig);

					if (options.schema) {
						configService.validate(options.schema);
					}

					if (options.namespaces) {
						for (const ns of options.namespaces) {
							const nsConfig = ns.factory(configService);
							if (ns.schema) {
								validateConfig(ns.schema, nsConfig);
							}
							configService.registerNamespace(ns.name, () => nsConfig);
						}
					}

					return configService;
				},
				inject: [NestConfigService]
			}
		];

		return {
			module: ConfigModule,
			global: options.isGlobal ?? true,
			imports: [nestModule],
			providers,
			exports: [ConfigService]
		};
	}

	/**
	 * @description 创建配置模块（同步版本）
	 *
	 * 适用于不需要 .env 文件加载的场景
	 *
	 * @example
	 * ```typescript
	 * @Module({
	 *   imports: [ConfigModule.forRootSync()],
	 * })
	 * export class AppModule {}
	 * ```
	 */
	public static forRootSync(options: ConfigModuleOptions = {}): DynamicModule {
		const configService = new ConfigService(options.configOptions);

		const providers: Provider[] = [
			{
				provide: ConfigService,
				useFactory: () => {
					if (options.schema) {
						configService.validate(options.schema);
					}

					if (options.namespaces) {
						for (const ns of options.namespaces) {
							const nsConfig = ns.factory(configService);
							if (ns.schema) {
								validateConfig(ns.schema, nsConfig);
							}
							configService.registerNamespace(ns.name, () => nsConfig);
						}
					}

					return configService;
				}
			}
		];

		return {
			module: ConfigModule,
			global: options.isGlobal ?? true,
			providers,
			exports: [ConfigService]
		};
	}

	/**
	 * @description 创建带特性配置的模块
	 *
	 * 用于在子模块中注册特定的命名空间配置
	 *
	 * @example
	 * ```typescript
	 * @Module({
	 *   imports: [
	 *     ConfigModule.forFeature({
	 *       name: 'database',
	 *       factory: (config) => ({
	 *         host: config.getRequired('DB_HOST'),
	 *         port: config.getInt('DB_PORT', { defaultValue: 5432 }),
	 *       }),
	 *     }),
	 *   ],
	 * })
	 * export class DatabaseModule {}
	 * ```
	 */
	public static forFeature(definition: NamespaceDefinition) {
		return {
			module: ConfigModule,
			providers: [
				{
					provide: `CONFIG_NAMESPACE_${definition.name}`,
					useFactory: (config: ConfigService) => {
						const nsConfig = definition.factory(config);
						if (definition.schema) {
							validateConfig(definition.schema, nsConfig);
						}
						return config.registerNamespace(definition.name, () => nsConfig);
					},
					inject: [ConfigService]
				}
			],
			exports: [`CONFIG_NAMESPACE_${definition.name}`]
		};
	}
}

/**
 * @description 获取命名空间配置的注入 token
 */
export function getNamespaceToken(name: string): string {
	return `CONFIG_NAMESPACE_${name}`;
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
export { ConfigSchemaError, validateConfig, type NamespaceConfig };
export { envSchema } from './config-schema';
