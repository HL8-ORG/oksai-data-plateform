import { Inject, Injectable, Logger } from '@nestjs/common';

import type { IAuthPort } from '@oksai/identity';
import { SignUpCommand, type SignUpResult } from '@oksai/identity';

/**
 * 注册命令处理器
 *
 * 处理用户注册请求，创建新用户并返回认证结果。
 */
@Injectable()
export class SignUpHandler {
	private readonly logger = new Logger(SignUpHandler.name);

	constructor(@Inject('IAuthPort') private readonly authPort: IAuthPort) {}

	/**
	 * 处理注册命令
	 *
	 * @param command - 注册命令
	 * @returns 注册结果
	 */
	async handle(command: SignUpCommand): Promise<SignUpResult> {
		this.logger.debug(`处理注册命令: ${command.email}`);

		const result = await this.authPort.signUpWithEmail(command.email, command.password, command.name);

		return {
			userId: result.userId.value,
			email: result.email.value,
			name: result.name,
			requireEmailVerification: false,
			token: result.token,
			expiresAt: result.expiresAt
		};
	}
}
