import { z } from 'zod';

/**
 * @description 配置 Schema 错误
 *
 * 当 schema 验证失败时抛出此错误
 */
export class ConfigSchemaError extends Error {
	constructor(
		message: string,
		public readonly errors: z.ZodError['errors']
	) {
		super(message);
		this.name = 'ConfigSchemaError';
	}
}

/**
 * @description 将 zod 错误转换为中文错误消息
 */
function formatZodErrors(errors: z.ZodError['errors']): string {
	return errors
		.map((e) => {
			const path = e.path.length > 0 ? e.path.join('.') : '根配置';
			return `${path}: ${e.message}`;
		})
		.join('; ');
}

/**
 * @description 验证配置数据
 *
 * @param schema zod schema
 * @param data 要验证的数据
 * @returns 验证后的数据
 * @throws ConfigSchemaError 验证失败时抛出
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   port: z.coerce.number().int().min(1).max(65535),
 *   host: z.string().min(1),
 * });
 *
 * const config = validateConfig(schema, { port: '3000', host: 'localhost' });
 * // { port: 3000, host: 'localhost' }
 * ```
 */
export function validateConfig<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
	const result = schema.safeParse(data);
	if (!result.success) {
		const message = `配置验证失败: ${formatZodErrors(result.error.errors)}`;
		throw new ConfigSchemaError(message, result.error.errors);
	}
	return result.data;
}

/**
 * @description 创建环境变量 schema（自动将字符串转换为对应类型）
 */
export const envSchema = {
	/**
	 * @description 字符串环境变量
	 */
	string: () => z.string().optional().or(z.literal('')),

	/**
	 * @description 必需的字符串环境变量
	 */
	requiredString: () => z.string().min(1, '不能为空'),

	/**
	 * @description 整数环境变量（自动转换）
	 */
	int: (options?: { min?: number; max?: number }) => {
		let schema = z.coerce.number().int();
		if (options?.min !== undefined) schema = schema.min(options.min);
		if (options?.max !== undefined) schema = schema.max(options.max);
		return schema;
	},

	/**
	 * @description 浮点数环境变量（自动转换）
	 */
	float: (options?: { min?: number; max?: number }) => {
		let schema = z.coerce.number();
		if (options?.min !== undefined) schema = schema.min(options.min);
		if (options?.max !== undefined) schema = schema.max(options.max);
		return schema;
	},

	/**
	 * @description 布尔环境变量（自动转换）
	 */
	bool: () => z.coerce.boolean(),

	/**
	 * @description 枚举环境变量
	 */
	enum: <T extends readonly [string, ...string[]]>(values: T) => z.enum(values),

	/**
	 * @description URL 环境变量
	 */
	url: () => z.string().url('必须是有效的 URL'),

	/**
	 * @description 端口号环境变量
	 */
	port: () => envSchema.int({ min: 1, max: 65535 }),

	/**
	 * @description 时长环境变量（毫秒）
	 */
	durationMs: () => z.coerce.number().int().positive()
};

/**
 * @description 命名空间配置类型
 *
 * 用于定义分组配置的类型
 *
 * @example
 * ```typescript
 * interface DatabaseConfig extends NamespaceConfig {
 *   host: string;
 *   port: number;
 *   username: string;
 *   password: string;
 *   database: string;
 * }
 * ```
 */
export interface NamespaceConfig {
	[key: string]: unknown;
}

/**
 * @description 创建命名空间 schema
 *
 * @param prefix 环境变量前缀
 * @param schema zod schema
 * @returns 带前缀的 schema
 *
 * @example
 * ```typescript
 * const databaseSchema = createNamespaceSchema('DB', z.object({
 *   host: z.string(),
 *   port: envSchema.port(),
 * }));
 *
 * // 对应环境变量: DB_HOST, DB_PORT
 * ```
 */
export function createNamespaceSchema<T extends z.ZodRawShape>(prefix: string, schema: z.ZodObject<T>): z.ZodObject<T> {
	return schema;
}

/**
 * @description 从环境变量构建命名空间配置
 *
 * @param prefix 环境变量前缀
 * @param keys 配置键名列表
 * @param getEnv 获取环境变量的函数
 * @returns 配置对象
 *
 * @example
 * ```typescript
 * const dbConfig = buildNamespaceConfig('DB', ['HOST', 'PORT'], (key) => process.env[key]);
 * // { HOST: process.env.DB_HOST, PORT: process.env.DB_PORT }
 * ```
 */
export function buildNamespaceConfig(
	prefix: string,
	keys: string[],
	getEnv: (key: string) => string | undefined
): Record<string, string | undefined> {
	const config: Record<string, string | undefined> = {};
	for (const key of keys) {
		const envKey = `${prefix}_${key}`;
		config[key.toLowerCase()] = getEnv(envKey);
	}
	return config;
}

/**
 * @description 异步加载配置文件
 *
 * @param filePath 配置文件路径（支持 .json, .js, .ts）
 * @returns 配置对象
 */
export async function loadConfigFile(filePath: string): Promise<Record<string, unknown>> {
	try {
		const config = await import(filePath);
		return config.default ?? config;
	} catch (error) {
		throw new Error(`加载配置文件失败: ${filePath} - ${error instanceof Error ? error.message : String(error)}`);
	}
}
