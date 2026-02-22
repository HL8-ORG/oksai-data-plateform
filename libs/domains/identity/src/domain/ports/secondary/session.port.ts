/**
 * 会话端口接口
 *
 * 定义会话管理的核心能力，用于管理用户会话的生命周期。
 *
 * @packageDocumentation
 */

import type { UserId } from '../../model/user-id.vo.js';
import type { SessionData } from './auth.port.js';

/**
 * 会话创建参数
 */
export interface CreateSessionParams {
	/**
	 * 用户 ID
	 */
	userId: UserId;

	/**
	 * IP 地址
	 */
	ipAddress?: string;

	/**
	 * User Agent
	 */
	userAgent?: string;

	/**
	 * 过期时间（秒），默认 1 小时
	 */
	expiresInSeconds?: number;
}

/**
 * 会话信息
 */
export interface SessionInfo {
	/**
	 * 会话 ID
	 */
	id: string;

	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 会话令牌
	 */
	token: string;

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
	 * 创建时间
	 */
	createdAt: Date;

	/**
	 * 更新时间
	 */
	updatedAt: Date;
}

/**
 * 会话端口
 *
 * 定义会话管理的核心能力接口。
 * 此接口由基础设施层实现，用于扩展或替代默认的会话管理。
 *
 * @example
 * ```typescript
 * // 在应用服务中使用
 * class SessionApplicationService {
 *   constructor(private readonly sessionPort: ISessionPort) {}
 *
 *   async createUserSession(userId: UserId): Promise<SessionInfo> {
 *     return this.sessionPort.createSession({ userId });
 *   }
 * }
 * ```
 */
export interface ISessionPort {
	/**
	 * 创建会话
	 *
	 * @param params - 创建参数
	 * @returns 会话信息
	 */
	createSession(params: CreateSessionParams): Promise<SessionInfo>;

	/**
	 * 获取会话
	 *
	 * @param sessionId - 会话 ID
	 * @returns 会话信息，如果不存在则返回 null
	 */
	getSession(sessionId: string): Promise<SessionInfo | null>;

	/**
	 * 通过令牌获取会话
	 *
	 * @param token - 会话令牌
	 * @returns 会话信息，如果不存在则返回 null
	 */
	getSessionByToken(token: string): Promise<SessionInfo | null>;

	/**
	 * 获取用户的所有会话
	 *
	 * @param userId - 用户 ID
	 * @returns 会话列表
	 */
	getUserSessions(userId: UserId): Promise<SessionInfo[]>;

	/**
	 * 更新会话
	 *
	 * @param sessionId - 会话 ID
	 * @param updates - 更新内容
	 * @returns 更新后的会话信息
	 */
	updateSession(sessionId: string, updates: Partial<SessionInfo>): Promise<SessionInfo>;

	/**
	 * 删除会话
	 *
	 * @param sessionId - 会话 ID
	 */
	deleteSession(sessionId: string): Promise<void>;

	/**
	 * 删除用户的所有会话
	 *
	 * @param userId - 用户 ID
	 */
	deleteUserSessions(userId: UserId): Promise<void>;

	/**
	 * 延长会话有效期
	 *
	 * @param sessionId - 会话 ID
	 * @param extendBySeconds - 延长的秒数
	 * @returns 更新后的会话信息
	 */
	extendSession(sessionId: string, extendBySeconds: number): Promise<SessionInfo>;

	/**
	 * 验证会话有效性
	 *
	 * @param token - 会话令牌
	 * @returns 会话数据，如果无效则返回 null
	 */
	validateSession(token: string): Promise<SessionData | null>;

	/**
	 * 获取活跃会话数量
	 *
	 * @param userId - 用户 ID
	 * @returns 活跃会话数量
	 */
	getActiveSessionCount(userId: UserId): Promise<number>;
}
