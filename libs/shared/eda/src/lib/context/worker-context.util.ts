import { runWithOksaiContext, type OksaiRequestContext } from '@oksai/context';

/**
 * @description 为 Worker/非 HTTP 场景的 handler 注入 Oksai CLS 上下文（tenant/user/locale/requestId）
 *
 * 设计目标：
 * - 让"每条任务消息/每次 job 执行"都有独立的 CLS store（避免并发任务互相污染）
 * - 让 `@oksai/logger` 与 `@oksai/db` 在 Worker 场景同样可用：
 *   - logger customProps：可从 CLS 读取 tenantId/userId/locale
 *   - Tenant-Aware Repository/Service：可从 OksaiRequestContextService 获取 tenantId 并自动注入过滤
 *
 * 使用方式：
 * - 你需要提供一个 `extractContext`，把消息体/任务参数映射为 `OksaiRequestContext`
 * - app 必须装配 `setupOksaiContextModule()`（或至少 `setupOksaiClsModule()`），保证 CLS 初始化
 *
 * @param extractContext - 从 handler 入参中提取上下文
 * @param handler - 原始 handler（可同步或异步）
 * @returns 包装后的 handler
 *
 * @example
 * ```ts
 * type Job = { tenantId: string; userId?: string; requestId: string };
 *
 * const handleJob = withOksaiWorkerContext(
 *   (job: Job) => ({ tenantId: job.tenantId, userId: job.userId, requestId: job.requestId, locale: 'zh' }),
 *   async (job: Job) => {
 *     // 在这里：logger/db 都可以拿到 tenantId
 *   }
 * );
 * ```
 */
export function withOksaiWorkerContext<TArgs extends unknown[], TResult>(
	extractContext: (...args: TArgs) => OksaiRequestContext,
	handler: (...args: TArgs) => TResult
): (...args: TArgs) => TResult {
	return (...args: TArgs) => {
		const ctx = extractContext(...args);
		return runWithOksaiContext(ctx, () => handler(...args));
	};
}

export interface WithOksaiWorkerContextFromJobOptions {
	/**
	 * @description 从 job/message 对象读取 tenantId 的字段名（默认 tenantId）
	 */
	tenantIdKey?: string;

	/**
	 * @description 从 job/message 对象读取 userId 的字段名（默认 userId）
	 */
	userIdKey?: string;

	/**
	 * @description 从 job/message 对象读取 requestId 的字段名（默认 requestId）
	 */
	requestIdKey?: string;

	/**
	 * @description 从 job/message 对象读取 locale 的字段名（默认 locale）
	 */
	localeKey?: string;
}

/**
 * @description Worker 场景便捷包装：从第一个参数（job/message）读取上下文字段并注入 CLS
 *
 * 约定：job/message 的字段名默认为 `tenantId/userId/requestId/locale`，可通过 options 覆盖。
 *
 * @example
 * ```ts
 * type Job = { tenantId: string; userId?: string; requestId: string; locale?: string };
 *
 * const handle = withOksaiWorkerContextFromJob(async (job: Job) => {
 *   // 在这里：logger/db 都能读取到 tenantId/userId/requestId/locale
 * });
 * ```
 */
export function withOksaiWorkerContextFromJob<TJob, TResult>(
	handler: (job: TJob) => TResult,
	options: WithOksaiWorkerContextFromJobOptions = {}
): (job: TJob) => TResult {
	const tenantIdKey = options.tenantIdKey ?? 'tenantId';
	const userIdKey = options.userIdKey ?? 'userId';
	const requestIdKey = options.requestIdKey ?? 'requestId';
	const localeKey = options.localeKey ?? 'locale';

	return withOksaiWorkerContext((job: TJob): OksaiRequestContext => {
		const anyJob = job as unknown as Record<string, unknown>;
		return {
			tenantId: typeof anyJob[tenantIdKey] === 'string' ? (anyJob[tenantIdKey] as string) : undefined,
			userId: typeof anyJob[userIdKey] === 'string' ? (anyJob[userIdKey] as string) : undefined,
			requestId: typeof anyJob[requestIdKey] === 'string' ? (anyJob[requestIdKey] as string) : undefined,
			locale: typeof anyJob[localeKey] === 'string' ? (anyJob[localeKey] as string) : undefined
		};
	}, handler);
}
