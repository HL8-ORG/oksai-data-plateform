/**
 * Guard 工具类
 *
 * 提供类型守卫和验证工具，用于参数验证和类型检查。
 *
 * @example
 * ```typescript
 * // 检查空值
 * if (Guard.isEmpty(value)) {
 *   return Result.fail('值不能为空');
 * }
 *
 * // 组合多个验证
 * const result = Guard.combine([
 *   Guard.againstEmpty('name', name),
 *   Guard.againstEmpty('email', email),
 * ]);
 * ```
 */
import { Result } from './result';

/**
 * 验证错误信息
 */
export interface GuardError {
	field: string;
	message: string;
}

export class Guard {
	/**
	 * 检查值是否为空（null、undefined、空字符串、空数组、空对象）
	 *
	 * @param value - 要检查的值
	 * @returns 如果为空返回 true
	 */
	public static isEmpty(value: unknown): boolean {
		if (value === null || value === undefined) {
			return true;
		}

		if (typeof value === 'string') {
			return value.trim().length === 0;
		}

		if (Array.isArray(value)) {
			return value.length === 0;
		}

		if (typeof value === 'object') {
			return Object.keys(value).length === 0;
		}

		return false;
	}

	/**
	 * 检查值是否不为空
	 *
	 * @param value - 要检查的值
	 * @returns 如果不为空返回 true
	 */
	public static isNotEmpty(value: unknown): boolean {
		return !this.isEmpty(value);
	}

	/**
	 * 检查是否为正数
	 *
	 * @param value - 要检查的值
	 * @returns 如果是正数返回 true
	 */
	public static isPositiveNumber(value: unknown): boolean {
		return typeof value === 'number' && !isNaN(value) && value > 0;
	}

	/**
	 * 检查是否为负数
	 *
	 * @param value - 要检查的值
	 * @returns 如果是负数返回 true
	 */
	public static isNegativeNumber(value: unknown): boolean {
		return typeof value === 'number' && !isNaN(value) && value < 0;
	}

	/**
	 * 检查是否为数字
	 *
	 * @param value - 要检查的值
	 * @returns 如果是数字返回 true
	 */
	public static isNumber(value: unknown): boolean {
		return typeof value === 'number' && !isNaN(value);
	}

	/**
	 * 检查是否为字符串
	 *
	 * @param value - 要检查的值
	 * @returns 如果是字符串返回 true
	 */
	public static isString(value: unknown): boolean {
		return typeof value === 'string';
	}

	/**
	 * 检查是否为布尔值
	 *
	 * @param value - 要检查的值
	 * @returns 如果是布尔值返回 true
	 */
	public static isBoolean(value: unknown): boolean {
		return typeof value === 'boolean';
	}

	/**
	 * 检查是否为对象（非数组、非 null）
	 *
	 * @param value - 要检查的值
	 * @returns 如果是对象返回 true
	 */
	public static isObject(value: unknown): boolean {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	/**
	 * 检查是否为数组
	 *
	 * @param value - 要检查的值
	 * @returns 如果是数组返回 true
	 */
	public static isArray(value: unknown): boolean {
		return Array.isArray(value);
	}

	/**
	 * 检查是否为有效的邮箱格式
	 *
	 * @param value - 要检查的值
	 * @returns 如果是有效邮箱返回 true
	 */
	public static isEmail(value: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(value);
	}

	/**
	 * 检查是否为有效的 UUID
	 *
	 * @param value - 要检查的值
	 * @returns 如果是有效 UUID 返回 true
	 */
	public static isUUID(value: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return uuidRegex.test(value);
	}

	/**
	 * 检查数字是否在指定范围内
	 *
	 * @param value - 要检查的数字
	 * @param min - 最小值（包含）
	 * @param max - 最大值（包含）
	 * @returns 如果在范围内返回 true
	 */
	public static inRange(value: number, min: number, max: number): boolean {
		return value >= min && value <= max;
	}

	/**
	 * 检查是否满足最小长度
	 *
	 * @param value - 要检查的值（字符串或数组）
	 * @param min - 最小长度
	 * @returns 如果满足最小长度返回 true
	 */
	public static minLength(value: string | unknown[], min: number): boolean {
		return value.length >= min;
	}

	/**
	 * 检查是否满足最大长度
	 *
	 * @param value - 要检查的值（字符串或数组）
	 * @param max - 最大长度
	 * @returns 如果满足最大长度返回 true
	 */
	public static maxLength(value: string | unknown[], max: number): boolean {
		return value.length <= max;
	}

	/**
	 * 验证值不为空
	 *
	 * @param field - 字段名称
	 * @param value - 要验证的值
	 * @returns 验证结果
	 */
	public static againstEmpty(field: string, value: unknown): Result<void, GuardError> {
		if (this.isEmpty(value)) {
			return Result.fail({
				field,
				message: `${field} 不能为空`
			});
		}
		return Result.ok(undefined);
	}

	/**
	 * 验证值不为 null
	 *
	 * @param field - 字段名称
	 * @param value - 要验证的值
	 * @returns 验证结果
	 */
	public static againstNull(field: string, value: unknown): Result<void, GuardError> {
		if (value === null) {
			return Result.fail({
				field,
				message: `${field} 不能为 null`
			});
		}
		return Result.ok(undefined);
	}

	/**
	 * 验证值不为 undefined
	 *
	 * @param field - 字段名称
	 * @param value - 要验证的值
	 * @returns 验证结果
	 */
	public static againstUndefined(field: string, value: unknown): Result<void, GuardError> {
		if (value === undefined) {
			return Result.fail({
				field,
				message: `${field} 不能为 undefined`
			});
		}
		return Result.ok(undefined);
	}

	/**
	 * 组合多个验证结果
	 *
	 * @param results - 验证结果数组
	 * @returns 组合后的验证结果
	 */
	public static combine(results: Result<void, GuardError>[]): Result<void, GuardError[]> {
		const errors: GuardError[] = [];

		for (const result of results) {
			if (result.isFail()) {
				errors.push(result.value as GuardError);
			}
		}

		if (errors.length > 0) {
			return Result.fail(errors);
		}

		return Result.ok(undefined);
	}
}
