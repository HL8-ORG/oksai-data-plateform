import { ConfigService } from '@oksai/config';

/**
 * @description EDA Metrics 启用选项
 */
export interface StartOksaiMetricsOptions {
	/**
	 * @description 是否启用 metrics
	 *
	 * 默认：读取配置 `metrics.enabled === true`
	 */
	enabled?: boolean;

	/**
	 * @description metrics 路由路径（默认 /metrics）
	 */
	path?: string;

	/**
	 * @description 是否启用默认进程指标（CPU/内存/事件循环等）
	 *
	 * 默认：true
	 */
	collectDefaultMetrics?: boolean;

	/**
	 * @description ConfigService 实例（推荐使用）
	 */
	configService?: ConfigService;
}

/**
 * @description EDA 事件处理指标记录器接口
 */
export interface OksaiMetricsRecorder {
	incIntegrationEventProcessedTotal(input: {
		mode: 'outbox' | 'projection';
		processor: string;
		eventName: string;
		result: 'success' | 'failed' | 'invalid_envelope' | 'dedup_skip';
	}): void;

	observeIntegrationEventLagMs(input: {
		mode: 'outbox' | 'projection';
		processor: string;
		eventName: string;
		lagMs: number;
	}): void;

	observeIntegrationEventDurationMs(input: {
		mode: 'outbox' | 'projection';
		processor: string;
		eventName: string;
		durationMs: number;
	}): void;
}

const NOOP_RECORDER: OksaiMetricsRecorder = {
	incIntegrationEventProcessedTotal: () => undefined,
	observeIntegrationEventLagMs: () => undefined,
	observeIntegrationEventDurationMs: () => undefined
};

let recorder: OksaiMetricsRecorder = NOOP_RECORDER;
let started = false;

/**
 * @description 获取 metrics recorder（未启用时为 no-op）
 */
export function getOksaiMetricsRecorder(): OksaiMetricsRecorder {
	return recorder;
}

/**
 * @description 重置 metrics 状态（仅用于测试）
 */
export function resetOksaiMetrics(): void {
	recorder = NOOP_RECORDER;
	started = false;
}

/**
 * @description 启用 metrics（可选能力）
 *
 * 说明：
 * - 为避免强绑定依赖，内部使用动态 import；未安装 `prom-client` 时会降级为 no-op
 * - metrics 默认不启用，避免在未建立访问控制时暴露内部指标
 *
 * @param fastify - Fastify 实例（用于注册 /metrics 路由）
 * @param options - 启用选项
 */
export async function startOksaiMetrics(
	fastify: { get: (path: string, handler: unknown) => unknown },
	options: StartOksaiMetricsOptions = {}
): Promise<void> {
	const enabled =
		options.enabled ??
		options.configService?.get<boolean>('metrics.enabled') ??
		process.env.METRICS_ENABLED === 'true';
	if (!enabled) return;
	if (started) return;

	const path = options.path ?? '/metrics';
	const collectDefault = options.collectDefaultMetrics ?? true;

	try {
		const prom = require('prom-client') as typeof import('prom-client');

		if (collectDefault) {
			prom.collectDefaultMetrics({ register: prom.register, prefix: 'oksai_' });
		}

		const processedTotal = new prom.Counter({
			name: 'oksai_integration_event_processed_total',
			help: '集成事件处理计数（按 mode/processor/eventName/result 维度）。',
			labelNames: ['mode', 'processor', 'eventName', 'result'] as const
		});

		const lagMs = new prom.Histogram({
			name: 'oksai_integration_event_lag_ms',
			help: '集成事件处理延迟（毫秒）：now - outbox.occurred_at。',
			labelNames: ['mode', 'processor', 'eventName'] as const,
			buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000]
		});

		const durationMs = new prom.Histogram({
			name: 'oksai_integration_event_duration_ms',
			help: '集成事件处理耗时（毫秒）：包含校验/去重/副作用/回写（按 mode/processor/eventName 维度）。',
			labelNames: ['mode', 'processor', 'eventName'] as const,
			buckets: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
		});

		recorder = {
			incIntegrationEventProcessedTotal: (input) => {
				processedTotal.labels(input.mode, input.processor, input.eventName, input.result).inc(1);
			},
			observeIntegrationEventLagMs: (input) => {
				lagMs.labels(input.mode, input.processor, input.eventName).observe(input.lagMs);
			},
			observeIntegrationEventDurationMs: (input) => {
				durationMs.labels(input.mode, input.processor, input.eventName).observe(input.durationMs);
			}
		};

		fastify.get(path, async (_req: unknown, reply: { header: (name: string, value: string) => void }) => {
			reply.header('Content-Type', prom.register.contentType);
			return await prom.register.metrics();
		});

		started = true;

		console.warn(`Metrics 已启用：GET ${path}（请确保对外访问已受控）。`);
	} catch (e) {
		console.warn('Metrics 启用失败（将降级为 no-op）。请确认已安装 prom-client。', e);
		recorder = NOOP_RECORDER;
	}
}
