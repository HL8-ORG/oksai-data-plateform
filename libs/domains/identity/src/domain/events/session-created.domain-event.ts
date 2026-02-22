import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

/**
 * 会话创建事件数据
 */
export interface SessionCreatedEventPayload {
	/**
	 * 会话 ID
	 */
	sessionId: string;

	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 会话令牌（脱敏）
	 */
	tokenPrefix: string;

	/**
	 * 过期时间
	 */
	expiresAt: Date;

	/**
	 * IP 地址
	 */
	ipAddress?: string;

	/**
	 * User Agent
	 */
	userAgent?: string;

	/**
	 * 设备信息
	 */
	deviceInfo?: {
		browser?: string;
		os?: string;
		device?: string;
	};

	/**
	 * 创建时间
	 */
	createdAt: Date;
}

/**
 * 会话创建事件
 *
 * 当新会话被创建时触发此事件。
 * 可用于：
 * - 会话审计
 * - 设备管理
 * - 安全监控
 * - 并发登录控制
 *
 * @example
 * ```typescript
 * const event = new SessionCreatedEvent({
 *   sessionId: 'session-123',
 *   userId: 'user-001',
 *   tokenPrefix: 'eyJhbG...',
 *   expiresAt: new Date(Date.now() + 3600000),
 *   ipAddress: '192.168.1.1',
 *   createdAt: new Date(),
 * }, new UniqueEntityID('session-123'));
 * ```
 */
export class SessionCreatedEvent extends DomainEvent<SessionCreatedEventPayload> {
	constructor(payload: SessionCreatedEventPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'SessionCreated',
			aggregateId,
			payload,
		});
	}
}

/**
 * 会话过期事件数据
 */
export interface SessionExpiredEventPayload {
	/**
	 * 会话 ID
	 */
	sessionId: string;

	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 过期时间
	 */
	expiredAt: Date;

	/**
	 * 过期原因
	 */
	reason: 'timeout' | 'manual' | 'logout' | 'security';
}

/**
 * 会话过期事件
 *
 * 当会话过期或被终止时触发此事件。
 * 可用于：
 * - 会话统计
 * - 安全审计
 * - 清理资源
 *
 * @example
 * ```typescript
 * const event = new SessionExpiredEvent({
 *   sessionId: 'session-123',
 *   userId: 'user-001',
 *   expiredAt: new Date(),
 *   reason: 'timeout',
 * }, new UniqueEntityID('session-123'));
 * ```
 */
export class SessionExpiredEvent extends DomainEvent<SessionExpiredEventPayload> {
	constructor(payload: SessionExpiredEventPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'SessionExpired',
			aggregateId,
			payload,
		});
	}
}
