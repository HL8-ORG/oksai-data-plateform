import type { SignOutCommand, SignOutResult } from '../sign-out.command.js';

/**
 * 登出命令处理器
 *
 * 处理用户登出请求，使会话失效。
 */
export class SignOutHandler {
	/**
	 * 处理登出命令
	 *
	 * @param command - 登出命令
	 * @returns 登出结果
	 */
	async handle(command: SignOutCommand): Promise<SignOutResult> {
		throw new Error('SignOutHandler.handle must be implemented with BetterAuthAdapter');
	}
}
