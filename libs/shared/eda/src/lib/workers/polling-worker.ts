/**
 * @description 从环境变量读取布尔值
 *
 * @param key - 环境变量名
 * @param defaultValue - 默认值
 * @param env - 环境变量对象
 * @returns 布尔值
 */
export function readBooleanFromEnv(key: string, defaultValue: boolean, env: NodeJS.ProcessEnv): boolean {
	const raw = (env[key] ?? '').trim().toLowerCase();
	if (raw === 'true' || raw === '1') return true;
	if (raw === 'false' || raw === '0') return false;
	return defaultValue;
}

/**
 * @description 从环境变量读取可选布尔值
 *
 * @param key - 环境变量名
 * @param env - 环境变量对象
 * @returns 布尔值或 undefined
 */
export function readOptionalBooleanFromEnv(key: string, env: NodeJS.ProcessEnv): boolean | undefined {
	const raw = (env[key] ?? '').trim().toLowerCase();
	if (raw === 'true' || raw === '1') return true;
	if (raw === 'false' || raw === '0') return false;
	return undefined;
}

/**
 * @description 从环境变量读取可选正整数
 *
 * @param key - 环境变量名
 * @param env - 环境变量对象
 * @returns 正整数或 undefined
 */
export function readOptionalPositiveIntFromEnv(key: string, env: NodeJS.ProcessEnv): number | undefined {
	const raw = (env[key] ?? '').trim();
	if (!raw) return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return undefined;
	return n;
}

/**
 * @description 轮询 Worker 日志接口（最小化依赖）
 */
export interface PollingWorkerLogger {
	log(obj: unknown, msg?: string): void;
	warn(obj: unknown, msg?: string): void;
	error(obj: unknown, msg?: string): void;
}

/**
 * @description 轮询 Worker 环境变量配置选项
 */
export interface PollingWorkerEnvOptions {
	/**
	 * @description Worker 是否启用的环境变量名（默认 WORKER_ENABLED）
	 */
	enabledKey?: string;

	/**
	 * @description 轮询间隔毫秒的环境变量名（默认 WORKER_POLL_INTERVAL_MS）
	 */
	intervalMsKey?: string;

	/**
	 * @description 单次批处理大小的环境变量名（默认 WORKER_BATCH_SIZE）
	 */
	batchSizeKey?: string;
}

/**
 * @description 轮询 Worker 配置选项
 */
export interface PollingWorkerOptions extends PollingWorkerEnvOptions {
	/**
	 * @description 日志输出使用的 Worker 名称（用于定位与告警）
	 */
	workerName: string;

	/**
	 * @description 轮询间隔最小值（ms，默认 200）
	 */
	minIntervalMs?: number;

	/**
	 * @description 默认轮询间隔（ms，默认 1000）
	 */
	defaultIntervalMs?: number;

	/**
	 * @description 默认批处理大小（默认 10）
	 */
	defaultBatchSize?: number;

	/**
	 * @description 批处理大小最大值（默认 200）
	 */
	maxBatchSize?: number;

	/**
	 * @description 日志对象
	 */
	logger: PollingWorkerLogger;

	/**
	 * @description 单次轮询处理逻辑
	 *
	 * @param batchSize - 已兜底/校验后的批处理大小
	 */
	tick: (batchSize: number) => Promise<void>;
}

/**
 * @description 轮询 Worker 控制器接口
 */
export interface PollingWorkerController {
	/**
	 * @description 启动 Worker
	 */
	start: () => void;

	/**
	 * @description 停止 Worker
	 */
	stop: () => void;
}

/**
 * @description 创建一个通用的"轮询式 Worker"控制器（基于 setInterval）
 *
 * 设计目标：
 * - 统一启用开关、轮询间隔、batchSize 的 env 解析与兜底逻辑
 * - 降低各域 Worker 重复代码，避免参数校验与日志语义不一致
 *
 * 注意事项：
 * - 本工具只负责调度与兜底，不负责具体业务处理与幂等（交由 tick 实现）
 * - tick 内部发生异常时会被捕获并记录中文错误日志，避免阻塞后续轮询
 *
 * @param options - 轮询 Worker 配置
 * @returns 控制器：start/stop
 */
export function createPollingWorker(options: PollingWorkerOptions): PollingWorkerController {
	const enabledKey = options.enabledKey ?? 'WORKER_ENABLED';
	const intervalMsKey = options.intervalMsKey ?? 'WORKER_POLL_INTERVAL_MS';
	const batchSizeKey = options.batchSizeKey ?? 'WORKER_BATCH_SIZE';

	const minIntervalMs = options.minIntervalMs ?? 200;
	const defaultIntervalMs = options.defaultIntervalMs ?? 1000;
	const defaultBatchSize = options.defaultBatchSize ?? 10;
	const maxBatchSize = options.maxBatchSize ?? 200;

	let timer: NodeJS.Timeout | null = null;

	function start(): void {
		if (timer) {
			options.logger.warn(`${options.workerName} 已启动，忽略重复 start 调用。`);
			return;
		}

		const enabled = readBooleanFromEnv(enabledKey, false, process.env);
		if (!enabled) {
			const raw = (process.env[enabledKey] ?? 'false').trim();
			options.logger.log(`${options.workerName} 已禁用（${enabledKey}=${raw || 'false'}）。`);
			return;
		}

		const rawIntervalMs = Number(process.env[intervalMsKey] ?? defaultIntervalMs);
		const intervalCandidate = Number.isFinite(rawIntervalMs) ? Math.floor(rawIntervalMs) : defaultIntervalMs;
		const safeIntervalMs = intervalCandidate >= minIntervalMs ? intervalCandidate : defaultIntervalMs;

		options.logger.log(`${options.workerName} 已启用，轮询间隔 ${safeIntervalMs}ms。`);
		timer = setInterval(() => void safeTick(), safeIntervalMs);
	}

	function stop(): void {
		if (timer) clearInterval(timer);
		timer = null;
	}

	async function safeTick(): Promise<void> {
		const rawBatchSize = Number(process.env[batchSizeKey] ?? defaultBatchSize);
		const batchCandidate = Number.isFinite(rawBatchSize) ? Math.floor(rawBatchSize) : defaultBatchSize;
		const safeBatchSize = batchCandidate > 0 && batchCandidate <= maxBatchSize ? batchCandidate : defaultBatchSize;

		try {
			await options.tick(safeBatchSize);
		} catch (e) {
			options.logger.error(
				{ err: e instanceof Error ? e.message : String(e) },
				`${options.workerName} 执行 tick 失败。`
			);
		}
	}

	return { start, stop };
}
