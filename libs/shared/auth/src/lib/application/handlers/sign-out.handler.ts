import { Inject, Injectable, Logger } from '@nestjs/common';

import type { IAuthPort } from '@oksai/identity';
import { SignOutCommand, type SignOutResult } from '@oksai/identity';

/**
 * 登出命令处理器
 *
 * 处理用户登出请求，使会话令牌失效。
 */
@Injectable()
export class SignOutHandler {
	private readonly logger = new Logger(SignOutHandler.name);

	constructor(@Inject('IAuthPort') private readonly authPort: IAuthPort) {}

	/**
	 * 处理登出命令
	 *
	 * @param command - 登出命令
	 * @returns 登出结果
	 */
	async handle(command: SignOutCommand): Promise<SignOutResult> {
		this.logger.debug(`处理登出命令: token=${command.token?.substring(0, 10)}...`);

		await this.authPort.signOut(command.token);

		return {
			success: true,
			signedOutSessionCount: 1
		};
	}
}
