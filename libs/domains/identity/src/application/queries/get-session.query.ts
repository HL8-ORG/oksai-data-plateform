import { Query } from './query.base.js';

/**
 * 获取会话查询
 *
 * 根据令牌获取会话详细信息。
 *
 * @example
 * ```typescript
 * const query = new GetSessionQuery({
 *   token: 'eyJhbGciOiJIUzI1NiIs...',
 * });
 * ```
 */
export class GetSessionQuery extends Query {
	/**
	 * 会话令牌
	 */
	readonly token: string;

	constructor(props: {
		token: string;
		correlationId?: string;
		tenantId?: string;
		userId?: string;
	}) {
		super('GetSession', {
			correlationId: props.correlationId,
			tenantId: props.tenantId,
			userId: props.userId,
		});

		this.token = props.token;
	}
}

/**
 * 会话详细信息
 */
export interface SessionDetails {
	/**
	 * 会话 ID
	 */
	sessionId: string;

	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 用户邮箱
	 */
	email: string;

	/**
	 * 用户名
	 */
	name: string;

	/**
	 * 会话令牌
	 */
	token: string;

	/**
	 * 过期时间
	 */
	expiresAt: Date;

	/**
	 * 是否有效
	 */
	isValid: boolean;

	/**
	 * IP 地址
	 */
	ipAddress?: string;

	/**
	 * User Agent
	 */
	userAgent?: string;

	/**
	 * 创建时间
	 */
	createdAt: Date;

	/**
	 * 更新时间
	 */
	updatedAt: Date;

	/**
	 * 剩余有效时间（秒）
	 */
	remainingSeconds: number;
}
