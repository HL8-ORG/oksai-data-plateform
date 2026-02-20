/**
 * Result 模式
 *
 * 用于函数式错误处理，避免抛出异常。
 * 明确区分成功和失败两种状态。
 *
 * @template T - 成功时的值类型
 * @template E - 失败时的错误类型
 *
 * @example
 * ```typescript
 * // 创建成功结果
 * const success = Result.ok<User>(user);
 * if (success.isOk()) {
 *   console.log(success.value); // User
 * }
 *
 * // 创建失败结果
 * const failure = Result.fail<User>(new Error('用户不存在'));
 * if (failure.isFail()) {
 *   console.log(failure.value); // Error
 * }
 * ```
 */
export class Result<T, E = Error> {
	/**
	 * 成功值（仅在成功时有值）
	 * @private
	 */
	private readonly _value?: T;

	/**
	 * 错误值（仅在失败时有值）
	 * @private
	 */
	private readonly _error?: E;

	/**
	 * 是否成功
	 * @private
	 */
	private readonly _isOk: boolean;

	/**
	 * 私有构造函数，请使用 Result.ok() 或 Result.fail() 创建实例
	 *
	 * @param isOk - 是否成功
	 * @param value - 成功值
	 * @param error - 错误值
	 * @private
	 */
	private constructor(isOk: boolean, value?: T, error?: E) {
		this._isOk = isOk;
		this._value = value;
		this._error = error;
	}

	/**
	 * 创建成功的 Result
	 *
	 * @param value - 成功值
	 * @returns 成功的 Result 实例
	 *
	 * @example
	 * ```typescript
	 * const result = Result.ok({ id: '123', name: '测试' });
	 * console.log(result.isOk()); // true
	 * ```
	 */
	public static ok<T, E = Error>(value: T): Result<T, E> {
		return new Result<T, E>(true, value, undefined);
	}

	/**
	 * 创建失败的 Result
	 *
	 * @param error - 错误值
	 * @returns 失败的 Result 实例
	 *
	 * @example
	 * ```typescript
	 * const result = Result.fail(new Error('操作失败'));
	 * console.log(result.isFail()); // true
	 * ```
	 */
	public static fail<T, E = Error>(error: E): Result<T, E> {
		return new Result<T, E>(false, undefined, error);
	}

	/**
	 * 判断是否成功
	 *
	 * @returns 如果是成功状态返回 true，否则返回 false
	 */
	public isOk(): boolean {
		return this._isOk;
	}

	/**
	 * 判断是否失败
	 *
	 * @returns 如果是失败状态返回 true，否则返回 false
	 */
	public isFail(): boolean {
		return !this._isOk;
	}

	/**
	 * 获取值
	 *
	 * - 成功时返回成功值
	 * - 失败时返回错误值
	 *
	 * @returns 成功值或错误值
	 */
	public get value(): T | E {
		if (this._isOk) {
			return this._value as T;
		}
		return this._error as E;
	}

	/**
	 * 获取错误值
	 *
	 * - 失败时返回错误值
	 * - 成功时返回 undefined
	 *
	 * @returns 错误值或 undefined
	 */
	public get error(): E | undefined {
		return this._error;
	}
}
