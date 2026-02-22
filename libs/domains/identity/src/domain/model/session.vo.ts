/**
 * 会话值对象
 *
 * 表示用户认证会话的不可变值对象。
 *
 * 业务规则：
 * - 会话 ID 不能为空
 * - 令牌不能为空
 * - 过期时间必须是未来时间
 *
 * @example
 * ```typescript
 * const session = SessionVO.create({
 *   id: 'session-123',
 *   userId: 'user-456',
 *   token: 'eyJhbGciOiJIUzI1NiIs...',
 *   expiresAt: new Date(Date.now() + 3600000),
 * });
 *
 * session.isValid(); // true
 * session.isExpired(); // false
 * ```
 */
export class SessionVO {
	private readonly _id: string;
	private readonly _userId: string;
	private readonly _token: string;
	private readonly _expiresAt: Date;
	private readonly _ipAddress?: string;
	private readonly _userAgent?: string;
	private readonly _createdAt: Date;

	private constructor(props: {
		id: string;
		userId: string;
		token: string;
		expiresAt: Date;
		ipAddress?: string;
		userAgent?: string;
		createdAt?: Date;
	}) {
		this._id = props.id;
		this._userId = props.userId;
		this._token = props.token;
		this._expiresAt = props.expiresAt;
		this._ipAddress = props.ipAddress;
		this._userAgent = props.userAgent;
		this._createdAt = props.createdAt ?? new Date();
		Object.freeze(this);
	}

	/**
	 * 创建会话值对象
	 *
	 * @param props - 会话属性
	 * @returns SessionVO 实例
	 * @throws Error 参数无效时
	 */
	static create(props: {
		id: string;
		userId: string;
		token: string;
		expiresAt: Date;
		ipAddress?: string;
		userAgent?: string;
		createdAt?: Date;
	}): SessionVO {
		if (!props.id?.trim()) {
			throw new Error('会话ID不能为空');
		}
		if (!props.userId?.trim()) {
			throw new Error('用户ID不能为空');
		}
		if (!props.token?.trim()) {
			throw new Error('令牌不能为空');
		}
		if (!(props.expiresAt instanceof Date) || isNaN(props.expiresAt.getTime())) {
			throw new Error('过期时间必须是有效的日期');
		}

		return new SessionVO({
			id: props.id.trim(),
			userId: props.userId.trim(),
			token: props.token.trim(),
			expiresAt: props.expiresAt,
			ipAddress: props.ipAddress?.trim(),
			userAgent: props.userAgent?.trim(),
			createdAt: props.createdAt,
		});
	}

	/**
	 * 会话 ID
	 */
	get id(): string {
		return this._id;
	}

	/**
	 * 用户 ID
	 */
	get userId(): string {
		return this._userId;
	}

	/**
	 * 会话令牌
	 */
	get token(): string {
		return this._token;
	}

	/**
	 * 过期时间
	 */
	get expiresAt(): Date {
		return this._expiresAt;
	}

	/**
	 * IP 地址
	 */
	get ipAddress(): string | undefined {
		return this._ipAddress;
	}

	/**
	 * User Agent
	 */
	get userAgent(): string | undefined {
		return this._userAgent;
	}

	/**
	 * 创建时间
	 */
	get createdAt(): Date {
		return this._createdAt;
	}

	/**
	 * 检查会话是否有效（未过期）
	 */
	isValid(): boolean {
		return !this.isExpired();
	}

	/**
	 * 检查会话是否已过期
	 */
	isExpired(): boolean {
		return new Date() >= this._expiresAt;
	}

	/**
	 * 获取剩余有效时间（秒）
	 */
	getRemainingSeconds(): number {
		const now = new Date();
		if (this._expiresAt <= now) {
			return 0;
		}
		return Math.floor((this._expiresAt.getTime() - now.getTime()) / 1000);
	}

	/**
	 * 比较两个会话是否相等
	 */
	equals(other: SessionVO): boolean {
		if (!other) return false;
		return this._id === other._id && this._token === other._token;
	}

	/**
	 * 转换为字符串
	 */
	toString(): string {
		return `Session(${this._id}, userId=${this._userId})`;
	}

	/**
	 * 序列化为 JSON
	 */
	toJSON(): {
		id: string;
		userId: string;
		token: string;
		expiresAt: string;
		ipAddress?: string;
		userAgent?: string;
		createdAt: string;
	} {
		return {
			id: this._id,
			userId: this._userId,
			token: this._token,
			expiresAt: this._expiresAt.toISOString(),
			ipAddress: this._ipAddress,
			userAgent: this._userAgent,
			createdAt: this._createdAt.toISOString(),
		};
	}
}
