/**
 * 邮箱值对象
 *
 * 业务规则：
 * - 必须符合邮箱格式
 * - 存储时统一小写
 * - 不可变
 *
 * @example
 * ```typescript
 * const email = Email.create('user@example.com');
 * email.value; // 'user@example.com'
 * email.getDomain(); // 'example.com'
 * email.equals(otherEmail); // boolean
 * ```
 */
export class Email {
	private readonly _value: string;

	private constructor(email: string) {
		this._value = email;
		Object.freeze(this);
	}

	/**
	 * 从字符串创建邮箱
	 *
	 * @param value - 邮箱字符串
	 * @returns Email 实例
	 * @throws Error 格式不正确时
	 */
	static create(value: string): Email {
		const normalized = this.normalize(value);
		this.validate(normalized);
		return new Email(normalized);
	}

	/**
	 * 获取邮箱值（原始字符串）
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * 比较两个邮箱是否相等
	 */
	equals(other: Email): boolean {
		if (!other) return false;
		return this._value === other._value;
	}

	/**
	 * 获取邮箱域名部分
	 *
	 * @example
	 * ```typescript
	 * Email.create('user@example.com').getDomain(); // 'example.com'
	 * ```
	 */
	getDomain(): string {
		const parts = this._value.split('@');
		return parts[1] ?? '';
	}

	/**
	 * 获取邮箱本地部分（@ 前）
	 *
	 * @example
	 * ```typescript
	 * Email.create('user@example.com').getLocalPart(); // 'user'
	 * ```
	 */
	getLocalPart(): string {
		const parts = this._value.split('@');
		return parts[0] ?? '';
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
	 * 标准化邮箱
	 */
	private static normalize(value: string): string {
		return String(value ?? '')
			.trim()
			.toLowerCase();
	}

	/**
	 * 验证邮箱格式
	 */
	private static validate(email: string): void {
		if (!email) {
			throw new Error('邮箱不能为空');
		}

		if (!email.includes('@')) {
			throw new Error('邮箱格式不正确，缺少 @ 符号');
		}

		const parts = email.split('@');
		if (parts.length !== 2) {
			throw new Error('邮箱格式不正确');
		}

		const [localPart, domain] = parts;
		if (!localPart || !domain) {
			throw new Error('邮箱格式不正确');
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw new Error(`邮箱格式不正确: ${email}`);
		}
	}
}
