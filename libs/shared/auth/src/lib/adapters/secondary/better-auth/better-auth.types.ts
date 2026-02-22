/**
 * Better Auth 特定类型定义
 *
 * 此文件仅包含 Better Auth 库特有的类型。
 * 领域层类型（AuthResult, SessionData, IAuthPort）请使用 @oksai/identity 中的定义。
 *
 * @packageDocumentation
 */

/**
 * Better Auth 用户信息
 *
 * 来自 Better Auth 的原始用户数据结构
 */
export interface BetterAuthUserInfo {
	/**
	 * 用户 ID
	 */
	id: string;

	/**
	 * 邮箱
	 */
	email: string;

	/**
	 * 用户名
	 */
	name: string;

	/**
	 * 头像 URL
	 */
	image?: string | null;

	/**
	 * 邮箱是否已验证
	 */
	emailVerified: boolean;
}

/**
 * Better Auth 会话信息
 *
 * 来自 Better Auth 的原始会话数据结构
 */
export interface BetterAuthSessionInfo {
	/**
	 * 会话 ID
	 */
	id: string;

	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 会话令牌
	 */
	token: string;

	/**
	 * 过期时间
	 */
	expiresAt: Date;

	/**
	 * IP 地址
	 */
	ipAddress?: string | null;

	/**
	 * User Agent
	 */
	userAgent?: string | null;
}

/**
 * Better Auth 组织信息
 *
 * 来自 Better Auth organization 插件的数据结构
 */
export interface BetterAuthOrganizationInfo {
	/**
	 * 组织 ID
	 */
	id: string;

	/**
	 * 组织名称
	 */
	name: string;

	/**
	 * 组织标识
	 */
	slug: string;

	/**
	 * Logo URL
	 */
	logo?: string | null;
}

/**
 * Better Auth 成员信息
 *
 * 来自 Better Auth organization 插件的成员数据结构
 */
export interface BetterAuthMemberInfo {
	/**
	 * 成员 ID
	 */
	id: string;

	/**
	 * 组织 ID
	 */
	organizationId: string;

	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 角色
	 */
	role: string;
}

/**
 * Better Auth 认证结果
 *
 * Better Auth API 返回的原始认证结果结构。
 * 此类型用于内部类型映射，对外暴露时转换为 @oksai/identity 的 AuthResult。
 */
export interface BetterAuthResult {
	/**
	 * 用户信息
	 */
	user: BetterAuthUserInfo;

	/**
	 * 会话信息
	 */
	session: BetterAuthSessionInfo;

	/**
	 * 当前组织（可选）
	 */
	organization?: BetterAuthOrganizationInfo;

	/**
	 * 成员角色（可选）
	 */
	memberRole?: string;
}
