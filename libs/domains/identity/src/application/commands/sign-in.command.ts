import { Command } from './command.base.js';

/**
 * 登录命令
 *
 * 用户使用邮箱和密码登录系统。
 *
 * @example
 * ```typescript
 * const command = new SignInCommand({
 *   email: 'user@example.com',
 *   password: 'password123',
 *   rememberMe: true,
 * });
 * ```
 */
export class SignInCommand extends Command {
	/**
	 * 用户邮箱
	 */
	readonly email: string;

	/**
	 * 用户密码
	 */
	readonly password: string;

	/**
	 * 是否记住登录
	 */
	readonly rememberMe: boolean;

	constructor(props: {
		email: string;
		password: string;
		rememberMe?: boolean;
		correlationId?: string;
		tenantId?: string;
	}) {
		super('SignIn', {
			correlationId: props.correlationId,
			tenantId: props.tenantId,
		});

		this.email = props.email.trim().toLowerCase();
		this.password = props.password;
		this.rememberMe = props.rememberMe ?? false;
	}
}

/**
 * 登录命令结果
 */
export interface SignInResult {
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
	 * 刷新令牌
	 */
	refreshToken?: string;

	/**
	 * 令牌过期时间
	 */
	expiresAt: Date;

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
}
