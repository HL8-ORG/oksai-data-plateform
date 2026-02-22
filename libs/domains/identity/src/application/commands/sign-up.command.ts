import { Command } from './command.base.js';

/**
 * 注册命令
 *
 * 使用邮箱和密码创建新用户账户。
 *
 * @example
 * ```typescript
 * const command = new SignUpCommand({
 *   email: 'user@example.com',
 *   password: 'securePassword123',
 *   name: 'John Doe',
 * });
 * ```
 */
export class SignUpCommand extends Command {
	/**
	 * 用户邮箱
	 */
	readonly email: string;

	/**
	 * 用户密码
	 */
	readonly password: string;

	/**
	 * 用户名
	 */
	readonly name: string;

	/**
	 * 回调 URL（用于邮箱验证）
	 */
	readonly callbackURL?: string;

	constructor(props: {
		email: string;
		password: string;
		name: string;
		callbackURL?: string;
		correlationId?: string;
		tenantId?: string;
	}) {
		super('SignUp', {
			correlationId: props.correlationId,
			tenantId: props.tenantId,
		});

		this.email = props.email.trim().toLowerCase();
		this.password = props.password;
		this.name = props.name.trim();
		this.callbackURL = props.callbackURL;
	}
}

/**
 * 注册命令结果
 */
export interface SignUpResult {
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
	 * 是否需要邮箱验证
	 */
	requireEmailVerification: boolean;

	/**
	 * 会话令牌（如果邮箱验证不是必需的）
	 */
	token?: string;

	/**
	 * 令牌过期时间
	 */
	expiresAt?: Date;
}
