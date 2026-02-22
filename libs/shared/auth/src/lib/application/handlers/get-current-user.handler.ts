import { Inject, Injectable, Logger } from '@nestjs/common';

import type { IAuthPort, SessionData } from '@oksai/identity';
import { GetCurrentUserQuery, type CurrentUserInfo } from '@oksai/identity';

/**
 * 获取当前用户查询处理器
 *
 * 验证会话令牌并返回当前用户信息。
 */
@Injectable()
export class GetCurrentUserHandler {
	private readonly logger = new Logger(GetCurrentUserHandler.name);

	constructor(@Inject('IAuthPort') private readonly authPort: IAuthPort) {}

	/**
	 * 处理获取当前用户查询
	 *
	 * @param query - 获取当前用户查询
	 * @returns 当前用户信息
	 */
	async handle(query: GetCurrentUserQuery): Promise<CurrentUserInfo> {
		this.logger.debug(`处理获取当前用户查询: token=${query.token?.substring(0, 10)}...`);

		const session = await this.authPort.verifySession(query.token);

		if (!session) {
			throw new Error('无效或过期的会话');
		}

		return this.mapToCurrentUserInfo(session);
	}

	/**
	 * 映射会话数据到当前用户信息
	 */
	private mapToCurrentUserInfo(session: SessionData): CurrentUserInfo {
		return {
			userId: session.userId,
			email: '',
			name: '',
			image: undefined,
			emailVerified: true,
			organization: session.organizationId
				? {
						id: session.organizationId,
						name: '',
						slug: '',
						logo: undefined
					}
				: undefined,
			role: session.roles[0],
			permissions: session.permissions,
			sessionId: session.sessionId,
			sessionExpiresAt: session.expiresAt
		};
	}
}
