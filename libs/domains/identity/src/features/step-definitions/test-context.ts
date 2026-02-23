/**
 * BDD 测试上下文
 *
 * 用于在步骤之间共享测试状态
 */
import type { User } from '../../domain/model/user.aggregate';

/**
 * 测试上下文接口
 */
export interface TestContext {
	/**
	 * 当前用户
	 */
	user: User | null;

	/**
	 * 邮箱地址
	 */
	email: string | null;

	/**
	 * 用户 ID
	 */
	userId: string | null;

	/**
	 * 错误信息
	 */
	error: Error | null;

	/**
	 * 触发的事件
	 */
	events: Array<{ type: string; payload: unknown }>;

	/**
	 * 重置上下文
	 */
	reset(): void;
}

/**
 * 创建测试上下文
 */
export function createTestContext(): TestContext {
	return {
		user: null,
		email: null,
		userId: null,
		error: null,
		events: [],

		reset() {
			this.user = null;
			this.email = null;
			this.userId = null;
			this.error = null;
			this.events = [];
		}
	};
}

/**
 * Mock 事件处理器
 */
export class MockEventHandler {
	private events: Array<{ type: string; payload: unknown }> = [];

	handle(eventType: string, payload: unknown): void {
		this.events.push({ type: eventType, payload });
	}

	getEvents(): Array<{ type: string; payload: unknown }> {
		return [...this.events];
	}

	clear(): void {
		this.events = [];
	}
}

/**
 * 验证 UUID 格式
 */
export function isValidUuid(value: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(value);
}
