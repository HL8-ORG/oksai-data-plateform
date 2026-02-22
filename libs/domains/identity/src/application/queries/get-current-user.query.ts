import { Query } from './query.base.js';

/**
 * 获取当前用户查询
 *
 * 根据令牌获取当前登录用户的详细信息。
 *
 * @example
 * ```typescript
 * const query = new GetCurrentUserQuery({
 *   token: 'eyJhbGciOiJIUzI1NiIs...',
 * });
 * ```
 */
export class GetCurrentUserQuery extends Query {
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
		super('GetCurrentUser', {
			correlationId: props.correlationId,
			tenantId: props.tenantId,
			userId: props.userId,
		});

		this.token = props.token;
	}
}

/**
 * 当前用户信息
 */
export interface CurrentUserInfo {
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
	 * 头像
	 */
	image?: string | null;

	/**
	 * 邮箱是否已验证
	 */
	emailVerified: boolean;

	/**
	 * 当前组织
	 */
	organization?: {
		id: string;
		name: string;
		slug: string;
		logo?: string | null;
	};

	/**
	 * 成员角色
	 */
	role?: string;

	/**
	 * 权限列表
	 */
	permissions: string[];

	/**
	 * 会话 ID
	 */
	sessionId: string;

	/**
	 * 会话过期时间
	 */
	sessionExpiresAt: Date;
}
