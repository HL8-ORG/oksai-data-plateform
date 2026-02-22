import type { BetterAuthResult } from '../adapters/secondary/better-auth/better-auth.types.js';

/**
 * 认证响应 DTO
 */
export class AuthResponseDto {
	/**
	 * 用户 ID
	 */
	userId!: string;

	/**
	 * 用户邮箱
	 */
	email!: string;

	/**
	 * 用户名
	 */
	name!: string;

	/**
	 * 头像
	 */
	image?: string | null;

	/**
	 * 会话令牌
	 */
	token!: string;

	/**
	 * 刷新令牌
	 */
	refreshToken?: string;

	/**
	 * 令牌过期时间
	 */
	expiresAt!: Date;

	/**
	 * 当前组织
	 */
	organization?: {
		id: string;
		name: string;
		slug: string;
	};

	/**
	 * 成员角色
	 */
	role?: string;

	/**
	 * 从 BetterAuthResult 创建 DTO
	 */
	static fromBetterAuthResult(result: BetterAuthResult): AuthResponseDto {
		const dto = new AuthResponseDto();
		dto.userId = result.user.id;
		dto.email = result.user.email;
		dto.name = result.user.name;
		dto.image = result.user.image;
		dto.token = result.session.token;
		dto.expiresAt = new Date(result.session.expiresAt);
		dto.organization = result.organization;
		dto.role = result.memberRole;
		return dto;
	}
}

/**
 * 用户信息响应 DTO
 */
export class UserInfoResponseDto {
	/**
	 * 用户 ID
	 */
	userId!: string;

	/**
	 * 用户邮箱
	 */
	email!: string;

	/**
	 * 用户名
	 */
	name!: string;

	/**
	 * 头像
	 */
	image?: string | null;

	/**
	 * 邮箱是否已验证
	 */
	emailVerified!: boolean;

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
	permissions!: string[];

	/**
	 * 会话 ID
	 */
	sessionId!: string;

	/**
	 * 会话过期时间
	 */
	sessionExpiresAt!: Date;
}

/**
 * 会话响应 DTO
 */
export class SessionResponseDto {
	/**
	 * 会话 ID
	 */
	sessionId!: string;

	/**
	 * 用户 ID
	 */
	userId!: string;

	/**
	 * 过期时间
	 */
	expiresAt!: Date;

	/**
	 * 是否有效
	 */
	isValid!: boolean;

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
	createdAt!: Date;

	/**
	 * 剩余有效时间（秒）
	 */
	remainingSeconds!: number;
}

/**
 * 注册响应 DTO
 */
export class SignUpResponseDto {
	/**
	 * 用户 ID
	 */
	userId!: string;

	/**
	 * 用户邮箱
	 */
	email!: string;

	/**
	 * 用户名
	 */
	name!: string;

	/**
	 * 是否需要邮箱验证
	 */
	requireEmailVerification!: boolean;

	/**
	 * 会话令牌（如果邮箱验证不是必需的）
	 */
	token?: string;

	/**
	 * 令牌过期时间
	 */
	expiresAt?: Date;
}

/**
 * 登出响应 DTO
 */
export class SignOutResponseDto {
	/**
	 * 是否成功
	 */
	success!: boolean;

	/**
	 * 消息
	 */
	message!: string;

	/**
	 * 已登出的会话数量
	 */
	signedOutSessionCount!: number;
}

/**
 * 错误响应 DTO
 */
export class ErrorResponseDto {
	/**
	 * 错误码
	 */
	code!: string;

	/**
	 * 错误消息
	 */
	message!: string;

	/**
	 * 详细信息
	 */
	details?: Record<string, unknown>;

	/**
	 * 时间戳
	 */
	timestamp!: Date;
}
