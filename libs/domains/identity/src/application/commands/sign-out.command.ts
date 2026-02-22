import { Command } from './command.base.js';

/**
 * 登出命令
 *
 * 用户登出系统，使当前会话失效。
 *
 * @example
 * ```typescript
 * const command = new SignOutCommand({
 *   token: 'eyJhbGciOiJIUzI1NiIs...',
 *   userId: 'user-123',
 * });
 * ```
 */
export class SignOutCommand extends Command {
	/**
	 * 会话令牌
	 */
	readonly token: string;

	/**
	 * 用户 ID
	 */
	readonly userId: string;

	/**
	 * 会话 ID（可选，用于精确登出）
	 */
	readonly sessionId?: string;

	/**
	 * 是否登出所有设备
	 */
	readonly signOutAllDevices: boolean;

	constructor(props: {
		token: string;
		userId: string;
		sessionId?: string;
		signOutAllDevices?: boolean;
		correlationId?: string;
		tenantId?: string;
	}) {
		super('SignOut', {
			correlationId: props.correlationId,
			tenantId: props.tenantId,
			userId: props.userId,
		});

		this.token = props.token;
		this.userId = props.userId;
		this.sessionId = props.sessionId;
		this.signOutAllDevices = props.signOutAllDevices ?? false;
	}
}

/**
 * 登出命令结果
 */
export interface SignOutResult {
	/**
	 * 是否成功
	 */
	success: boolean;

	/**
	 * 已登出的会话数量
	 */
	signedOutSessionCount: number;
}
