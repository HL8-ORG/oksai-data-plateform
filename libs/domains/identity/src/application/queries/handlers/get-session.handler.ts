import type { GetSessionQuery, SessionDetails } from '../get-session.query.js';

/**
 * 获取会话查询处理器
 *
 * 根据令牌获取会话详细信息。
 */
export class GetSessionHandler {
	/**
	 * 处理获取会话查询
	 *
	 * @param query - 获取会话查询
	 * @returns 会话详细信息，如果无效则返回 null
	 */
	async handle(query: GetSessionQuery): Promise<SessionDetails | null> {
		throw new Error('GetSessionHandler.handle must be implemented with BetterAuthAdapter');
	}
}
