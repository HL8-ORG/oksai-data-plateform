import type { SignInCommand, SignInResult } from '../sign-in.command.js';

/**
 * 登录命令处理器
 *
 * 处理用户登录请求，验证凭证并返回认证结果。
 */
export class SignInHandler {
	/**
	 * 处理登录命令
	 *
	 * @param command - 登录命令
	 * @returns 登录结果
	 */
	async handle(command: SignInCommand): Promise<SignInResult> {
		// 此处理器需要注入 BetterAuthAdapter
		// 实际实现在具体的 NestJS 服务中完成
		throw new Error('SignInHandler.handle must be implemented with BetterAuthAdapter');
	}
}
