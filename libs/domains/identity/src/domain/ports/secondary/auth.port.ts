/**
 * 认证端口接口
 *
 * 定义身份认证的核心能力，由基础设施层的 BetterAuthAdapter 实现。
 * 此接口遵循六边形架构的 Port 模式，确保领域层与具体认证实现解耦。
 *
 * @packageDocumentation
 */

import type { Email } from '../../model/email.vo.js';
import type { UserId } from '../../model/user-id.vo.js';

/**
 * 认证结果
 *
 * 认证成功后返回的用户和会话信息
 */
export interface AuthResult {
	/**
	 * 用户 ID
	 */
	userId: UserId;

	/**
	 * 用户邮箱
	 */
	email: Email;

	/**
	 * 用户名
	 */
	name: string;

	/**
	 * 会话令牌
	 */
	token: string;

	/**
	 * 刷新令牌（可选）
	 */
	refreshToken?: string;

	/**
	 * 令牌过期时间
	 */
	expiresAt: Date;

	/**
	 * 组织 ID（多租户场景）
	 */
	organizationId?: string;

	/**
	 * 成员角色（组织内角色）
	 */
	role?: string;
}

/**
 * 会话数据
 *
 * 从令牌中解析出的会话上下文信息
 */
export interface SessionData {
	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 组织 ID（可选）
	 */
	organizationId?: string;

	/**
	 * 角色列表
	 */
	roles: string[];

	/**
	 * 权限列表
	 */
	permissions: string[];

	/**
	 * 会话 ID
	 */
	sessionId: string;

	/**
	 * 令牌过期时间
	 */
	expiresAt: Date;
}

/**
 * 认证端口
 *
 * 定义身份认证的核心能力接口。
 * 此接口由基础设施层的 BetterAuthAdapter 实现。
 *
 * @example
 * ```typescript
 * // 在领域服务中使用
 * class AuthenticationDomainService {
 *   constructor(private readonly authPort: IAuthPort) {}
 *
 *   async authenticate(email: string, password: string): Promise<AuthResult> {
 *     return this.authPort.signInWithEmail(email, password);
 *   }
 * }
 * ```
 */
export interface IAuthPort {
	/**
	 * 邮箱密码注册
	 *
	 * @param email - 邮箱地址
	 * @param password - 密码
	 * @param name - 用户名
	 * @returns 认证结果
	 * @throws {AuthenticationException} 注册失败时抛出
	 */
	signUpWithEmail(email: string, password: string, name: string): Promise<AuthResult>;

	/**
	 * 邮箱密码登录
	 *
	 * @param email - 邮箱地址
	 * @param password - 密码
	 * @returns 认证结果
	 * @throws {AuthenticationException} 登录失败时抛出
	 */
	signInWithEmail(email: string, password: string): Promise<AuthResult>;

	/**
	 * 登出
	 *
	 * @param token - 会话令牌
	 */
	signOut(token: string): Promise<void>;

	/**
	 * 验证会话
	 *
	 * 验证令牌有效性并返回会话数据
	 *
	 * @param token - 会话令牌
	 * @returns 会话数据，如果令牌无效则返回 null
	 */
	verifySession(token: string): Promise<SessionData | null>;

	/**
	 * 刷新令牌
	 *
	 * @param refreshToken - 刷新令牌
	 * @returns 新的认证结果
	 * @throws {AuthenticationException} 刷新失败时抛出
	 */
	refreshToken(refreshToken: string): Promise<AuthResult>;

	/**
	 * 发送邮箱验证邮件
	 *
	 * @param email - 邮箱地址
	 * @param callbackURL - 验证成功后的回调 URL
	 */
	sendVerificationEmail(email: string, callbackURL?: string): Promise<void>;

	/**
	 * 发送密码重置邮件
	 *
	 * @param email - 邮箱地址
	 * @param callbackURL - 重置成功后的回调 URL
	 */
	sendPasswordResetEmail(email: string, callbackURL?: string): Promise<void>;

	/**
	 * 重置密码
	 *
	 * @param token - 重置令牌（从邮件中获取）
	 * @param newPassword - 新密码
	 */
	resetPassword(token: string, newPassword: string): Promise<void>;

	/**
	 * 验证邮箱
	 *
	 * @param token - 验证令牌（从邮件中获取）
	 */
	verifyEmail(token: string): Promise<void>;
}

/**
 * 认证异常
 *
 * 认证过程中发生的业务异常
 */
export class AuthenticationException extends Error {
	constructor(
		message: string,
		public readonly code: AuthenticationErrorCode,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'AuthenticationException';
	}
}

/**
 * 认证错误码
 */
export enum AuthenticationErrorCode {
	/** 无效凭证 */
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
	/** 用户已存在 */
	USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
	/** 邮箱未验证 */
	EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
	/** 令牌无效 */
	INVALID_TOKEN = 'INVALID_TOKEN',
	/** 令牌已过期 */
	TOKEN_EXPIRED = 'TOKEN_EXPIRED',
	/** 密码强度不足 */
	WEAK_PASSWORD = 'WEAK_PASSWORD',
	/** 用户被禁用 */
	USER_DISABLED = 'USER_DISABLED',
	/** 未知错误 */
	UNKNOWN = 'UNKNOWN',
}
