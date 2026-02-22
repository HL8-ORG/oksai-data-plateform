/**
 * @description 计算 Outbox 失败后的下一次重试退避秒数
 *
 * 规则：
 * - 使用指数退避：min(2^n, 300)s
 *
 * @param retryCount - 当前重试次数（Outbox 表中的 retry_count）
 */
export function computeOutboxNextRetrySeconds(retryCount: number): number {
	return Math.min(Math.pow(2, Math.max(0, retryCount)), 300);
}

/**
 * @description 读取 Outbox 最大重试次数（超过后进入 dead，停止自动重试）
 *
 * 环境变量（任一即可）：
 * - `OKSAI_OUTBOX_MAX_RETRY_COUNT`
 * - `OUTBOX_MAX_RETRY_COUNT`
 *
 * @returns 最大重试次数（默认 10，最小 1）
 */
export function readOutboxMaxRetryCount(): number {
	const raw = (process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT ?? process.env.OUTBOX_MAX_RETRY_COUNT ?? '').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n >= 1) return Math.floor(n);
	return 10;
}

/**
 * @description 计算 Outbox 延迟毫秒数
 *
 * @param occurredAt - 事件发生时间
 * @returns 延迟毫秒数，若时间无效则返回 undefined
 */
export function computeOutboxLagMs(occurredAt: string | Date): number | undefined {
	const dt = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
	if (!Number.isFinite(dt.getTime())) return undefined;
	return Math.max(0, Date.now() - dt.getTime());
}
