import type { SignUpCommand, SignUpResult } from '../sign-up.command.js';

/**
 * 注册命令处理器
 *
 * 处理用户注册请求，创建新用户账户。
 */
export class SignUpHandler {
	/**
	 * 处理注册命令
	 *
	 * @param command - 注册命令
	 * @returns 注册结果
	 */
	async handle(command: SignUpCommand): Promise<SignUpResult> {
		throw new Error('SignUpHandler.handle must be implemented with BetterAuthAdapter');
	}
}
