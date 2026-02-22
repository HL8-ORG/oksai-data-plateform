import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

/**
 * 用户认证事件数据
 */
export interface UserAuthenticatedEventPayload {
	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 用户邮箱
	 */
	email: string;

	/**
	 * 会话 ID
	 */
	sessionId: string;

	/**
	 * 认证方式
	 */
	authMethod: 'email_password' | 'oauth' | 'sso' | 'api_key';

	/**
	 * IP 地址
	 */
	ipAddress?: string;

	/**
	 * User Agent
	 */
	userAgent?: string;

	/**
	 * 组织 ID（多租户场景）
	 */
	organizationId?: string;

	/**
	 * 认证时间
	 */
	authenticatedAt: Date;
}

/**
 * 用户认证事件
 *
 * 当用户成功通过认证时触发此事件。
 * 可用于：
 * - 记录登录日志
 * - 触发欢迎流程
 * - 更新最后登录时间
 * - 发送安全通知
 *
 * @example
 * ```typescript
 * const event = new UserAuthenticatedEvent({
 *   userId: 'user-001',
 *   email: 'user@example.com',
 *   sessionId: 'session-123',
 *   authMethod: 'email_password',
 *   ipAddress: '192.168.1.1',
 *   authenticatedAt: new Date(),
 * }, new UniqueEntityID('user-001'));
 * ```
 */
export class UserAuthenticatedEvent extends DomainEvent<UserAuthenticatedEventPayload> {
	constructor(payload: UserAuthenticatedEventPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'UserAuthenticated',
			aggregateId,
			payload,
		});
	}
}
