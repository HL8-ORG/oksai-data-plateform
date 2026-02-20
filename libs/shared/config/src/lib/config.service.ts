/**
 * 配置服务
 *
 * 提供环境变量和配置的访问接口。
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
 * ```
 */
export class ConfigService {
	/**
	 * 获取配置值
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 配置值或默认值
	 */
	public get(key: string, defaultValue?: string): string | undefined {
		return process.env[key] ?? defaultValue;
	}

	/**
	 * 获取必需的配置值
	 *
	 * @param key - 配置键名
	 * @returns 配置值
	 * @throws Error 如果配置不存在
	 */
	public getRequired(key: string): string {
		const value = process.env[key];
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
		const value = process.env[key];
		if (value === undefined) {
			return defaultValue ?? NaN;
		}
		return parseInt(value, 10);
	}

	/**
	 * 获取布尔类型的配置值
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 布尔类型的配置值
	 */
	public getBoolean(key: string, defaultValue?: boolean): boolean {
		const value = process.env[key];
		if (value === undefined) {
			return defaultValue ?? false;
		}
		return value.toLowerCase() === 'true';
	}

	/**
	 * 获取 Node 环境标识
	 *
	 * @returns Node 环境标识（development/test/production）
	 */
	public getNodeEnv(): string {
		return process.env.NODE_ENV ?? 'development';
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
	public static forRoot(options?: { isGlobal?: boolean }) {
		return {
			module: ConfigModule,
			global: options?.isGlobal ?? true,
			providers: [ConfigService],
			exports: [ConfigService]
		};
	}
}
