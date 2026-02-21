/**
 * @description 环境变量解析器 - 基于 @oksai/env 纯函数实现
 *
 * 提供类型安全的环境变量读取方法：
 * - 解析失败直接抛错，阻止应用在错误配置下启动
 * - 错误信息使用中文，便于快速定位
 * - 支持 getSafeXxx 方法返回 Result 类型
 *
 * @module @oksai/config
 */
import { Result } from '@oksai/kernel';
import {
	parseOptionalBoolean,
	parseOptionalInt,
	parseOptionalFloat,
	parseOptionalNonEmptyString,
	parseOptionalUrl,
	parseOptionalJson,
	parseOptionalDurationMs,
	parseOptionalEnum,
	parseCsv,
	type ParseCsvOptions
} from './internal/env-parsers';

/**
 * @description 配置错误类型
 *
 * 当环境变量解析失败时抛出此错误
 */
export class ConfigEnvError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConfigEnvError';
	}
}

// ============ 选项接口 ============

export interface EnvStringOptions {
	defaultValue?: string;
	trim?: boolean;
}

export interface EnvIntOptions {
	defaultValue?: number;
	min?: number;
	max?: number;
}

export interface EnvFloatOptions {
	defaultValue?: number;
	min?: number;
	max?: number;
}

export interface EnvBoolOptions {
	defaultValue?: boolean;
}

export interface EnvEnumOptions<T extends string> {
	defaultValue?: T;
}

export interface EnvUrlOptions {
	defaultValue?: string;
	allowedProtocols?: string[];
}

export interface EnvJsonOptions<T> {
	defaultValue?: T;
}

export interface EnvListOptions {
	defaultValue?: string[];
	separator?: string;
	trim?: boolean;
}

export interface EnvDurationMsOptions {
	defaultValue?: number;
	min?: number;
	max?: number;
}

// ============ 环境变量解析器 ============

/**
 * @description 环境变量解析器
 *
 * 提供类型安全的环境变量读取方法：
 * - 解析失败直接抛错，阻止应用在错误配置下启动
 * - 错误信息使用中文，便于快速定位
 * - 支持 getSafeXxx 方法返回 Result 类型
 *
 * @example
 * ```typescript
 * // 直接读取（失败抛错）
 * const port = env.int('PORT', { defaultValue: 3000, min: 1, max: 65535 });
 * const url = env.url('DATABASE_URL', { allowedProtocols: ['postgresql:'] });
 *
 * // 安全读取（返回 Result）
 * const result = env.getSafeInt('PORT');
 * if (result.isOk()) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export const env = {
	/**
	 * @description 读取字符串环境变量
	 */
	string(name: string, options: EnvStringOptions = {}): string {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		if (options.trim === false) return raw;

		const parsed = parseOptionalNonEmptyString(raw);
		if (parsed !== undefined) return parsed;

		if (options.defaultValue !== undefined) return options.defaultValue;
		throw new ConfigEnvError(`环境变量 ${name} 为空字符串`);
	},

	/**
	 * @description 读取整数环境变量
	 */
	int(name: string, options: EnvIntOptions = {}): number {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		const parsed = parseOptionalInt(raw);
		if (parsed === undefined) {
			throw new ConfigEnvError(`环境变量 ${name} 不是有效整数：${raw}`);
		}

		if (options.min !== undefined && parsed < options.min) {
			throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}：${parsed}`);
		}
		if (options.max !== undefined && parsed > options.max) {
			throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}：${parsed}`);
		}

		return parsed;
	},

	/**
	 * @description 读取浮点数环境变量
	 */
	float(name: string, options: EnvFloatOptions = {}): number {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		const parsed = parseOptionalFloat(raw);
		if (parsed === undefined) {
			throw new ConfigEnvError(`环境变量 ${name} 不是有效浮点数：${raw}`);
		}

		if (options.min !== undefined && parsed < options.min) {
			throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}：${parsed}`);
		}
		if (options.max !== undefined && parsed > options.max) {
			throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}：${parsed}`);
		}

		return parsed;
	},

	/**
	 * @description 读取布尔环境变量（true/false/1/0）
	 */
	bool(name: string, options: EnvBoolOptions = {}): boolean {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		const parsed = parseOptionalBoolean(raw);
		if (parsed !== undefined) return parsed;

		throw new ConfigEnvError(`环境变量 ${name} 不是有效布尔值（true/false/1/0）：${raw}`);
	},

	/**
	 * @description 读取枚举环境变量
	 *
	 * @example
	 * ```typescript
	 * const mode = env.enum('MODE', ['dev', 'prod'] as const, { defaultValue: 'dev' });
	 * ```
	 */
	enum<const T extends readonly string[]>(
		name: string,
		allowed: T,
		options: EnvEnumOptions<T[number]> = {}
	): T[number] {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		const parsed = parseOptionalEnum(raw, { allowed });
		if (parsed !== undefined) return parsed;

		throw new ConfigEnvError(`环境变量 ${name} 的值不合法：${raw}，允许值为：${allowed.join(', ')}`);
	},

	/**
	 * @description 读取 URL 环境变量
	 */
	url(name: string, options: EnvUrlOptions = {}): string {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		const parsed = parseOptionalUrl(raw, { allowedProtocols: options.allowedProtocols });
		if (parsed !== undefined) return raw.trim();

		// 区分是 URL 格式错误还是协议不允许
		const basicUrl = parseOptionalUrl(raw);
		if (basicUrl === undefined) {
			throw new ConfigEnvError(`环境变量 ${name} 不是有效 URL：${raw}`);
		}
		throw new ConfigEnvError(
			`环境变量 ${name} 的协议不被允许：${basicUrl.protocol}，允许协议：${options.allowedProtocols?.join(', ')}`
		);
	},

	/**
	 * @description 读取 JSON 环境变量
	 */
	json<T>(name: string, options: EnvJsonOptions<T> = {}): T {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		const parsed = parseOptionalJson<T>(raw);
		if (parsed !== undefined) return parsed;

		throw new ConfigEnvError(`环境变量 ${name} 不是有效 JSON：${raw}`);
	},

	/**
	 * @description 读取列表环境变量（默认以逗号分隔）
	 */
	list(name: string, options: EnvListOptions = {}): string[] {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		return parseCsv(raw, {
			separator: options.separator
		} as ParseCsvOptions).map((s) => ((options.trim ?? true) ? s : s));
	},

	/**
	 * @description 读取时长环境变量并转换为毫秒
	 *
	 * 支持格式：
	 * - 纯数字：`1500`（毫秒）
	 * - 带单位：`2s`、`5m`、`1h`、`1d`
	 */
	durationMs(name: string, options: EnvDurationMsOptions = {}): number {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}

		const parsed = parseOptionalDurationMs(raw, { min: options.min, max: options.max });
		if (parsed !== undefined) return parsed;

		// 检查是否是格式问题还是范围问题
		const basicParsed = parseOptionalDurationMs(raw);
		if (basicParsed === undefined) {
			throw new ConfigEnvError(`环境变量 ${name} 不是有效时长：${raw}（示例：1500/2s/5m/1h/1d）`);
		}

		if (options.min !== undefined && basicParsed < options.min) {
			throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}ms：${basicParsed}ms`);
		}
		if (options.max !== undefined && basicParsed > options.max) {
			throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}ms：${basicParsed}ms`);
		}

		throw new ConfigEnvError(`环境变量 ${name} 不是有效时长：${raw}`);
	},

	// ============ 安全解析方法（返回 Result 类型） ============

	/**
	 * @description 安全读取字符串环境变量，返回 Result 类型
	 */
	getSafeString(name: string, options: EnvStringOptions = {}): Result<string, string> {
		try {
			return Result.ok(this.string(name, options));
		} catch (e) {
			return Result.fail(e instanceof Error ? e.message : String(e));
		}
	},

	/**
	 * @description 安全读取整数环境变量，返回 Result 类型
	 */
	getSafeInt(name: string, options: EnvIntOptions = {}): Result<number, string> {
		try {
			return Result.ok(this.int(name, options));
		} catch (e) {
			return Result.fail(e instanceof Error ? e.message : String(e));
		}
	},

	/**
	 * @description 安全读取浮点数环境变量，返回 Result 类型
	 */
	getSafeFloat(name: string, options: EnvFloatOptions = {}): Result<number, string> {
		try {
			return Result.ok(this.float(name, options));
		} catch (e) {
			return Result.fail(e instanceof Error ? e.message : String(e));
		}
	},

	/**
	 * @description 安全读取布尔环境变量，返回 Result 类型
	 */
	getSafeBool(name: string, options: EnvBoolOptions = {}): Result<boolean, string> {
		try {
			return Result.ok(this.bool(name, options));
		} catch (e) {
			return Result.fail(e instanceof Error ? e.message : String(e));
		}
	},

	/**
	 * @description 安全读取 JSON 环境变量，返回 Result 类型
	 */
	getSafeJson<T>(name: string, options: EnvJsonOptions<T> = {}): Result<T, string> {
		try {
			return Result.ok(this.json(name, options));
		} catch (e) {
			return Result.fail(e instanceof Error ? e.message : String(e));
		}
	}
};
