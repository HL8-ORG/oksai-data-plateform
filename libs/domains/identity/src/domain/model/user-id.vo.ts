/**
 * 用户ID值对象
 *
 * 业务规则：
 * - 不能为空
 * - 不可变
 *
 * @example
 * ```typescript
 * const userId = UserId.create('user-123');
 * const newUserId = UserId.create(); // 生成新 UUID
 * userId.equals(otherId); // boolean
 * ```
 */
export class UserId {
	private readonly _value: string;

	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * 从字符串创建用户ID
	 *
	 * @param value - 用户ID字符串（可选，不提供则生成UUID）
	 * @returns UserId 实例
	 * @throws Error 为空时
	 */
	static create(value?: string): UserId {
		const actualValue = value ?? crypto.randomUUID();
		const normalized = String(actualValue ?? '').trim();
		if (!normalized) {
			throw new Error('用户ID不能为空');
		}
		return new UserId(normalized);
	}

	/**
	 * 获取用户ID值
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * 比较两个用户ID是否相等
	 */
	equals(other: UserId): boolean {
		if (!other) return false;
		return this._value === other._value;
	}

	/**
	 * 转换为字符串
	 */
	toString(): string {
		return this._value;
	}

	/**
	 * 序列化为JSON
	 */
	toJSON(): string {
		return this._value;
	}

	/**
	 * 验证是否为有效的UUID格式
	 */
	static isValidUUID(value: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(value);
	}
}
