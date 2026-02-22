import { AsyncLocalStorage } from 'async_hooks';

/**
 * @description Oksai 请求上下文接口
 *
 * 表示当前请求/任务的上下文信息，用于多租户隔离和请求追踪。
 */
export interface OksaiRequestContext {
	/**
	 * 请求 ID（用于追踪请求链路）
	 */
	requestId?: string;

	/**
	 * 租户 ID（用于多租户隔离）
	 */
	tenantId?: string;

	/**
	 * 用户 ID（用于审计和权限控制）
	 */
	userId?: string;

	/**
	 * 语言区域设置
	 */
	locale?: string;
}

/**
 * @description 上下文存储 Key
 *
 * @internal
 */
export const OKSAI_CONTEXT_KEYS = {
	requestId: 'oksai:requestId',
	tenantId: 'oksai:tenantId',
	userId: 'oksai:userId',
	locale: 'oksai:locale'
} as const;

/**
 * @description 全局 AsyncLocalStorage 实例
 *
 * @internal
 */
let globalAls: AsyncLocalStorage<Map<string, unknown>> | null = null;

/**
 * @description 获取或创建全局 ALS 实例
 *
 * @internal
 */
function getOrCreateAls(): AsyncLocalStorage<Map<string, unknown>> {
	if (!globalAls) {
		globalAls = new AsyncLocalStorage<Map<string, unknown>>();
	}
	return globalAls;
}

/**
 * @description 在 Worker/非 HTTP 场景创建并运行一段带 Oksai 上下文的逻辑
 *
 * 说明：
 * - 适用于后台任务（Worker、队列消费、定时任务等），用于显式指定 `tenantId/userId/locale/requestId`
 * - 会创建一个新的 ALS store（不会污染其他任务链路）
 *
 * @param ctx - 需要写入的上下文字段
 * @param fn - 在该上下文中运行的逻辑（可同步或异步）
 * @returns fn 的返回值
 *
 * @example
 * ```ts
 * import { runWithOksaiContext } from '@oksai/context';
 *
 * await runWithOksaiContext(
 *   { tenantId: 't-001', userId: 'u-001', requestId: 'job-123', locale: 'zh' },
 *   async () => {
 *     // 在这里可以访问上下文
 *   }
 * );
 * ```
 */
export function runWithOksaiContext<T>(ctx: OksaiRequestContext, fn: () => T): T {
	const als = getOrCreateAls();
	const store = new Map<string, unknown>();

	if (ctx.requestId) store.set(OKSAI_CONTEXT_KEYS.requestId, ctx.requestId);
	if (ctx.tenantId) store.set(OKSAI_CONTEXT_KEYS.tenantId, ctx.tenantId);
	if (ctx.userId) store.set(OKSAI_CONTEXT_KEYS.userId, ctx.userId);
	if (ctx.locale) store.set(OKSAI_CONTEXT_KEYS.locale, ctx.locale);

	return als.run(store, fn);
}

/**
 * @description 从当前 ALS 中读取 OksaiRequestContext
 *
 * @returns 上下文字段快照
 */
export function getOksaiRequestContextFromCurrent(): OksaiRequestContext {
	try {
		const als = getOrCreateAls();
		const store = als.getStore();
		if (!store) return {};

		return {
			requestId: store.get(OKSAI_CONTEXT_KEYS.requestId) as string | undefined,
			tenantId: store.get(OKSAI_CONTEXT_KEYS.tenantId) as string | undefined,
			userId: store.get(OKSAI_CONTEXT_KEYS.userId) as string | undefined,
			locale: store.get(OKSAI_CONTEXT_KEYS.locale) as string | undefined
		};
	} catch {
		return {};
	}
}
