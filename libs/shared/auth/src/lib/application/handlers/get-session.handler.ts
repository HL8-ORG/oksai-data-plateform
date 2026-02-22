import { Inject, Injectable, Logger } from '@nestjs/common';

import type { IAuthPort, SessionData } from '@oksai/identity';
import { GetSessionQuery, type SessionDetails } from '@oksai/identity';

/**
 * 获取会话查询处理器
 *
 * 验证会话令牌并返回会话详情。
 */
@Injectable()
export class GetSessionHandler {
	private readonly logger = new Logger(GetSessionHandler.name);

	constructor(@Inject('IAuthPort') private readonly authPort: IAuthPort) {}

	/**
	 * 处理获取会话查询
	 *
	 * @param query - 获取会话查询
	 * @returns 会话详情
	 */
	async handle(query: GetSessionQuery): Promise<SessionDetails> {
		this.logger.debug(`处理获取会话查询: token=${query.token?.substring(0, 10)}...`);

		const session = await this.authPort.verifySession(query.token);

		if (!session) {
			throw new Error('无效或过期的会话');
		}

		return this.mapToSessionDetails(session, query.token);
	}

	/**
	 * 映射会话数据到会话详情
	 */
	private mapToSessionDetails(session: SessionData, token: string): SessionDetails {
		const now = new Date();
		const remainingMs = session.expiresAt.getTime() - now.getTime();

		return {
			sessionId: session.sessionId,
			userId: session.userId,
			email: '',
			name: '',
			token: token,
			expiresAt: session.expiresAt,
			isValid: remainingMs > 0,
			ipAddress: undefined,
			userAgent: undefined,
			createdAt: now,
			updatedAt: now,
			remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000))
		};
	}
}
