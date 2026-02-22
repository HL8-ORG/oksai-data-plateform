import type { GetCurrentUserQuery, CurrentUserInfo } from '../get-current-user.query.js';

/**
 * 获取当前用户查询处理器
 *
 * 根据令牌获取当前登录用户的详细信息。
 */
export class GetCurrentUserHandler {
	/**
	 * 处理获取当前用户查询
	 *
	 * @param query - 获取当前用户查询
	 * @returns 当前用户信息，如果无效则返回 null
	 */
	async handle(query: GetCurrentUserQuery): Promise<CurrentUserInfo | null> {
		throw new Error('GetCurrentUserHandler.handle must be implemented with BetterAuthAdapter');
	}
}
