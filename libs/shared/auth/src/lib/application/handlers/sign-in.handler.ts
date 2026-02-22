import { Inject, Injectable, Logger } from '@nestjs/common';

import type { IAuthPort } from '@oksai/identity';
import { SignInCommand, type SignInResult } from '@oksai/identity';

/**
 * 登录命令处理器
 *
 * 处理用户登录请求，验证凭证并返回认证结果。
 */
@Injectable()
export class SignInHandler {
	private readonly logger = new Logger(SignInHandler.name);

	constructor(@Inject('IAuthPort') private readonly authPort: IAuthPort) {}

	/**
	 * 处理登录命令
	 *
	 * @param command - 登录命令
	 * @returns 登录结果
	 */
	async handle(command: SignInCommand): Promise<SignInResult> {
		this.logger.debug(`处理登录命令: ${command.email}`);

		const result = await this.authPort.signInWithEmail(command.email, command.password);

		return {
			userId: result.userId.value,
			email: result.email.value,
			name: result.name,
			token: result.token,
			refreshToken: result.refreshToken,
			expiresAt: result.expiresAt,
			organization: result.organizationId
				? {
						id: result.organizationId,
						name: '',
						slug: ''
					}
				: undefined,
			role: result.role
		};
	}
}
