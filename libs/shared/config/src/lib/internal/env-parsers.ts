/**
 * @description 环境变量解析器 - 纯函数集合
 *
 * 设计原则：
 * - 所有函数为纯函数，无副作用
 * - 解析失败返回 undefined（静默失败）
 * - 不直接访问 process.env，由调用方注入
 * - 零外部依赖
 *
 * @module @oksai/config/internal/env-parsers
 */

/**
 * @description 环境变量记录类型（用于便于测试注入）
 */
export type EnvRecord = Record<string, string | undefined>;

/**
 * @description CSV 解析选项
 */
export interface ParseCsvOptions {
	/**
	 * @description 分隔符（默认逗号）
	 */
	separator?: string;
}

/**
 * @description URL 解析选项
 */
export interface ParseUrlOptions {
	/**
	 * @description 允许的协议列表（如 ['https:', 'http:']）
	 */
	allowedProtocols?: string[];
}

/**
 * @description 时长解析选项
 */
export interface ParseDurationMsOptions {
	/**
	 * @description 最小值（毫秒）
	 */
	min?: number;
	/**
	 * @description 最大值（毫秒）
	 */
	max?: number;
}

/**
 * @description 枚举解析选项
 */
export interface ParseEnumOptions<T extends string> {
	/**
	 * @description 允许的值列表
	 */
	allowed: readonly T[];
}

// ============ 基础解析函数 ============

/**
 * @description 解析"可选非空字符串"（trim 后）
 *
 * 业务规则：
 * - undefined/空字符串/trim 后为空：返回 undefined
 * - 否则返回 trim 后的字符串
 *
 * @param raw - 原始字符串
 * @returns string | undefined
 *
 * @example
 * parseOptionalNonEmptyString(undefined) // undefined
 * parseOptionalNonEmptyString('  hello  ') // 'hello'
 */
export function parseOptionalNonEmptyString(raw: string | undefined): string | undefined {
	const v = (raw ?? '').trim();
	return v.length > 0 ? v : undefined;
}

/**
 * @description 解析"逗号分隔列表"（CSV）
 *
 * 业务规则：
 * - 空字符串/undefined：返回空数组
 * - 每项 trim，过滤空项
 *
 * @param raw - 原始字符串
 * @param options - 解析选项
 * @returns 解析后的字符串数组
 *
 * @example
 * parseCsv(undefined) // []
 * parseCsv('a, b, c') // ['a', 'b', 'c']
 * parseCsv('a|b|c', { separator: '|' }) // ['a', 'b', 'c']
 */
export function parseCsv(raw: string | undefined, options?: ParseCsvOptions): string[] {
	const v = (raw ?? '').trim();
	if (!v) return [];

	const sep = options?.separator ?? ',';
	return v
		.split(sep)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * @description 解析"可选布尔值"（支持 true/1/false/0）
 *
 * 业务规则：
 * - 空字符串/undefined：返回 undefined
 * - `true` / `1` -> true
 * - `false` / `0` -> false
 * - 其他：返回 undefined
 *
 * @param raw - 原始字符串
 * @returns boolean | undefined
 *
 * @example
 * parseOptionalBoolean('true') // true
 * parseOptionalBoolean('1') // true
 * parseOptionalBoolean('FALSE') // false
 * parseOptionalBoolean('yes') // undefined
 */
export function parseOptionalBoolean(raw: string | undefined): boolean | undefined {
	const v = (raw ?? '').trim().toLowerCase();
	if (!v) return undefined;
	if (v === 'true' || v === '1') return true;
	if (v === 'false' || v === '0') return false;
	return undefined;
}

/**
 * @description 解析"可选整数"
 *
 * 业务规则：
 * - 空字符串/undefined：返回 undefined
 * - 非数字/非纯整数格式：返回 undefined
 * - 合法：返回整数
 *
 * @param raw - 原始字符串
 * @returns number | undefined
 *
 * @example
 * parseOptionalInt('123') // 123
 * parseOptionalInt('12.9') // 12
 * parseOptionalInt('abc') // undefined
 * parseOptionalInt('12.5.6') // undefined
 */
export function parseOptionalInt(raw: string | undefined): number | undefined {
	const v = (raw ?? '').trim();
	if (!v) return undefined;

	// 检查是否为有效的整数格式（可选负号 + 数字）
	if (!/^-?\d+$/.test(v)) return undefined;

	const n = Number.parseInt(v, 10);
	if (Number.isNaN(n)) return undefined;
	return n;
}

/**
 * @description 解析"可选正整数"（大于 0）
 *
 * @param raw - 原始字符串
 * @returns number | undefined
 *
 * @example
 * parseOptionalPositiveInt('10') // 10
 * parseOptionalPositiveInt('0') // undefined
 * parseOptionalPositiveInt('-5') // undefined
 */
export function parseOptionalPositiveInt(raw: string | undefined): number | undefined {
	const n = parseOptionalInt(raw);
	if (n === undefined || n <= 0) return undefined;
	return n;
}

/**
 * @description 解析"可选浮点数"
 *
 * @param raw - 原始字符串
 * @returns number | undefined
 *
 * @example
 * parseOptionalFloat('3.14') // 3.14
 * parseOptionalFloat('abc') // undefined
 */
export function parseOptionalFloat(raw: string | undefined): number | undefined {
	const v = (raw ?? '').trim();
	if (!v) return undefined;
	const n = Number.parseFloat(v);
	if (Number.isNaN(n)) return undefined;
	return n;
}

/**
 * @description 解析"可选 URL"
 *
 * @param raw - 原始字符串
 * @param options - 解析选项（allowedProtocols）
 * @returns URL 对象 | undefined
 *
 * @example
 * parseOptionalUrl('https://example.com') // URL { href: 'https://example.com/' }
 * parseOptionalUrl('invalid') // undefined
 * parseOptionalUrl('ftp://example.com', { allowedProtocols: ['https:'] }) // undefined
 */
export function parseOptionalUrl(raw: string | undefined, options?: ParseUrlOptions): URL | undefined {
	const v = (raw ?? '').trim();
	if (!v) return undefined;

	let url: URL;
	try {
		url = new URL(v);
	} catch {
		return undefined;
	}

	if (options?.allowedProtocols?.length) {
		if (!options.allowedProtocols.includes(url.protocol)) {
			return undefined;
		}
	}

	return url;
}

/**
 * @description 解析"可选 JSON"
 *
 * @param raw - 原始字符串
 * @returns 解析后的值 | undefined
 *
 * @example
 * parseOptionalJson('{"a":1}') // { a: 1 }
 * parseOptionalJson('invalid') // undefined
 */
export function parseOptionalJson<T = unknown>(raw: string | undefined): T | undefined {
	const v = (raw ?? '').trim();
	if (!v) return undefined;

	try {
		return JSON.parse(v) as T;
	} catch {
		return undefined;
	}
}

/**
 * @description 解析"可选时长"并转换为毫秒
 *
 * 支持格式：
 * - 纯数字：`1500`（毫秒）
 * - 带单位：`2s`（秒）、`5m`（分钟）、`1h`（小时）、`1d`（天）
 *
 * @param raw - 原始字符串
 * @param options - 解析选项（min, max）
 * @returns 毫秒数 | undefined
 *
 * @example
 * parseOptionalDurationMs('2000') // 2000
 * parseOptionalDurationMs('2s') // 2000
 * parseOptionalDurationMs('5m') // 300000
 * parseOptionalDurationMs('1h') // 3600000
 */
export function parseOptionalDurationMs(raw: string | undefined, options?: ParseDurationMsOptions): number | undefined {
	const v = (raw ?? '').trim().toLowerCase();
	if (!v) return undefined;

	const m = /^(\d+)(ms|s|m|h|d)?$/.exec(v);
	if (!m) return undefined;

	const n = Number.parseInt(m[1] ?? '', 10);
	if (Number.isNaN(n)) return undefined;

	const unit = m[2] ?? 'ms';
	let ms: number;

	switch (unit) {
		case 'ms':
			ms = n;
			break;
		case 's':
			ms = n * 1000;
			break;
		case 'm':
			ms = n * 60_000;
			break;
		case 'h':
			ms = n * 3_600_000;
			break;
		case 'd':
			ms = n * 86_400_000;
			break;
		default:
			return undefined;
	}

	if (options?.min !== undefined && ms < options.min) return undefined;
	if (options?.max !== undefined && ms > options.max) return undefined;

	return ms;
}

/**
 * @description 解析"可选枚举值"
 *
 * @param raw - 原始字符串
 * @param options - 解析选项（allowed 值列表）
 * @returns 枚举值 | undefined
 *
 * @example
 * parseOptionalEnum('dev', { allowed: ['dev', 'prod'] as const }) // 'dev'
 * parseOptionalEnum('test', { allowed: ['dev', 'prod'] as const }) // undefined
 */
export function parseOptionalEnum<const T extends string>(
	raw: string | undefined,
	options: ParseEnumOptions<T>
): T | undefined {
	const v = (raw ?? '').trim();
	if (!v) return undefined;

	if ((options.allowed as readonly string[]).includes(v)) {
		return v as T;
	}
	return undefined;
}

// ============ 环境读取函数（注入 EnvRecord） ============

/**
 * @description 从 env 读取布尔值
 *
 * @param name - 环境变量名
 * @param defaultValue - 默认值
 * @param env - 环境变量对象
 */
export function readBooleanFromEnv(name: string, defaultValue: boolean, env: EnvRecord): boolean {
	const parsed = parseOptionalBoolean(env[name]);
	return parsed ?? defaultValue;
}

/**
 * @description 从 env 读取可选布尔值
 */
export function readOptionalBooleanFromEnv(name: string, env: EnvRecord): boolean | undefined {
	return parseOptionalBoolean(env[name]);
}

/**
 * @description 从 env 读取整数
 */
export function readIntFromEnv(name: string, defaultValue: number, env: EnvRecord): number {
	const parsed = parseOptionalInt(env[name]);
	return parsed ?? defaultValue;
}

/**
 * @description 从 env 读取可选整数
 */
export function readOptionalIntFromEnv(name: string, env: EnvRecord): number | undefined {
	return parseOptionalInt(env[name]);
}

/**
 * @description 从 env 读取可选正整数
 */
export function readOptionalPositiveIntFromEnv(name: string, env: EnvRecord): number | undefined {
	return parseOptionalPositiveInt(env[name]);
}

/**
 * @description 从 env 读取可选浮点数
 */
export function readOptionalFloatFromEnv(name: string, env: EnvRecord): number | undefined {
	return parseOptionalFloat(env[name]);
}

/**
 * @description 从 env 读取可选非空字符串
 */
export function readOptionalNonEmptyStringFromEnv(name: string, env: EnvRecord): string | undefined {
	return parseOptionalNonEmptyString(env[name]);
}

/**
 * @description 从 env 读取 CSV 列表
 */
export function readCsvFromEnv(name: string, env: EnvRecord, options?: ParseCsvOptions): string[] {
	return parseCsv(env[name], options);
}

/**
 * @description 从 env 读取可选 URL
 */
export function readOptionalUrlFromEnv(name: string, env: EnvRecord, options?: ParseUrlOptions): URL | undefined {
	return parseOptionalUrl(env[name], options);
}

/**
 * @description 从 env 读取可选 JSON
 */
export function readOptionalJsonFromEnv<T = unknown>(name: string, env: EnvRecord): T | undefined {
	return parseOptionalJson<T>(env[name]);
}

/**
 * @description 从 env 读取可选时长（毫秒）
 */
export function readOptionalDurationMsFromEnv(
	name: string,
	env: EnvRecord,
	options?: ParseDurationMsOptions
): number | undefined {
	return parseOptionalDurationMs(env[name], options);
}

/**
 * @description 从 env 读取可选枚举值
 */
export function readOptionalEnumFromEnv<const T extends string>(
	name: string,
	env: EnvRecord,
	options: ParseEnumOptions<T>
): T | undefined {
	return parseOptionalEnum(env[name], options);
}
