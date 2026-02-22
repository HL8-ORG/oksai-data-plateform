import { parseOksaiIntegrationEvent, type OksaiIntegrationEvent } from '@oksai/contracts';
import type { KafkaConsumerLike } from './kafka.loader';
import { loadKafkaJs } from './kafka.loader';
import { parseKafkaEnvConfig } from './kafka.config';
import type { KafkaLogger } from './kafka-event-producer';

/**
 * @description Kafka 集成事件 Consumer 配置选项
 */
export interface KafkaIntegrationEventConsumerOptions {
	/**
	 * @description 日志对象
	 */
	logger: KafkaLogger;

	/**
	 * @description 是否启用（默认 false）
	 */
	enabled?: boolean;

	/**
	 * @description Kafka brokers
	 */
	brokers: string[];

	/**
	 * @description Kafka clientId
	 */
	clientId: string;

	/**
	 * @description Kafka groupId
	 */
	groupId: string;

	/**
	 * @description Kafka topic
	 */
	topic: string;
}

/**
 * @description Kafka Consumer 启动选项
 */
export interface KafkaIntegrationEventConsumerStartOptions {
	/**
	 * @description 处理消息回调（已解析并校验为 OksaiIntegrationEvent）
	 */
	onEvent: (envelope: OksaiIntegrationEvent) => Promise<void>;
}

/**
 * @description Kafka eachMessage payload（最小类型）
 */
type EachMessagePayloadLike = {
	topic: string;
	partition: number;
	message: { value?: { toString: (encoding: string) => string } | null; offset: string };
	heartbeat?: () => Promise<void>;
};

/**
 * @description Kafka 集成事件 Consumer（P1：最小可运行）
 *
 * 业务定位：
 * - 从 Kafka topic 消费集成事件信封，并回调给业务方处理
 *
 * 注意事项：
 * - `kafkajs` 为 optionalDependencies：仅在 enabled=true 时动态加载
 * - 本 consumer 只负责"拉取 + 解析/校验 + 回调"，不直接耦合 Outbox/Inbox（由上层 worker 负责）
 */
export class KafkaIntegrationEventConsumer {
	private readonly enabled: boolean;
	private readonly logger: KafkaLogger;
	private readonly topic: string;
	private consumer: KafkaConsumerLike | null = null;

	constructor(private readonly options: KafkaIntegrationEventConsumerOptions) {
		this.enabled = options.enabled ?? false;
		this.logger = options.logger;
		this.topic = options.topic;
	}

	/**
	 * @description 从环境变量创建 Consumer（默认关闭）
	 *
	 * @param input - 依赖
	 * @param overrides - 覆盖项（例如 groupId/topic）
	 * @returns Consumer（启用时），否则返回 null
	 */
	static fromEnv(
		input: { logger: KafkaLogger },
		overrides: { groupId?: string; topic?: string } = {}
	): KafkaIntegrationEventConsumer | null {
		const cfg = parseKafkaEnvConfig();
		if (!cfg.enabled) return null;
		if (!cfg.brokers || cfg.brokers.length === 0) {
			input.logger.warn('已启用 Kafka（KAFKA_ENABLED=true），但未配置 KAFKA_BROKERS，Kafka Consumer 未创建。');
			return null;
		}
		const groupId = overrides.groupId ?? cfg.groupId ?? 'oksai.integration-consumer';
		const topic = overrides.topic ?? cfg.topic;

		return new KafkaIntegrationEventConsumer({
			logger: input.logger,
			enabled: cfg.enabled,
			brokers: cfg.brokers,
			clientId: cfg.clientId,
			groupId,
			topic
		});
	}

	/**
	 * @description 启动消费（connect + subscribe + run）
	 *
	 * @param input - 启动参数
	 */
	async start(input: KafkaIntegrationEventConsumerStartOptions): Promise<void> {
		if (!this.enabled) return;
		if (this.consumer) return;

		const { Kafka } = loadKafkaJs();
		const kafka = new Kafka({
			clientId: this.options.clientId,
			brokers: this.options.brokers
		});

		this.consumer = kafka.consumer({ groupId: this.options.groupId });
		await this.consumer.connect();
		await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

		this.logger.log(
			{
				clientId: this.options.clientId,
				brokers: this.options.brokers,
				topic: this.topic,
				groupId: this.options.groupId
			},
			'Kafka Consumer 已启动。'
		);

		await this.consumer.run({
			autoCommit: false,
			eachMessage: async ({ topic, partition, message, heartbeat }: EachMessagePayloadLike) => {
				if (!message.value) {
					this.logger.warn({ topic, partition }, 'Kafka 消息 value 为空，已跳过。');
					await this.commitOffsetSafely(topic, partition, message.offset);
					return;
				}

				let envelope: OksaiIntegrationEvent;
				try {
					const raw = message.value.toString('utf8');
					envelope = parseOksaiIntegrationEvent(JSON.parse(raw));
				} catch (e) {
					const errMsg = e instanceof Error ? e.message : String(e);
					this.logger.error(
						{
							topic,
							partition,
							offset: message.offset,
							err: errMsg
						},
						'Kafka 消息解析为集成事件信封失败，已跳过（避免阻塞分区）。'
					);
					await this.commitOffsetSafely(topic, partition, message.offset);
					return;
				}

				try {
					await input.onEvent(envelope);
				} catch (e) {
					const errMsg = e instanceof Error ? e.message : String(e);
					this.logger.error(
						{
							topic,
							partition,
							offset: message.offset,
							tenantId: envelope.tenantId,
							eventId: envelope.eventId,
							eventName: envelope.eventName,
							err: errMsg
						},
						'Kafka 消息处理失败，将触发重试（不提交 offset）。'
					);
					await this.backoffPartitionSafely(topic, partition, heartbeat);
					return;
				}

				await this.commitOffsetSafely(topic, partition, message.offset);
			}
		});
	}

	/**
	 * @description 停止消费并断开连接
	 */
	async stop(): Promise<void> {
		if (!this.consumer) return;
		await this.consumer.disconnect();
		this.consumer = null;
		this.logger.log('Kafka Consumer 已停止。');
	}

	private async commitOffsetSafely(topic: string, partition: number, offset: string): Promise<void> {
		if (!this.consumer?.commitOffsets) return;
		try {
			const nextOffset = (BigInt(offset) + 1n).toString();
			await this.consumer.commitOffsets([{ topic, partition, offset: nextOffset }]);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			this.logger.error(
				{ topic, partition, offset, err: errMsg },
				'提交 Kafka offset 失败（将依赖自动重平衡恢复）。'
			);
		}
	}

	/**
	 * @description 对指定分区做可控退避（可选 pause/resume）
	 *
	 * 设计目标：
	 * - 避免业务处理抛错时导致 Kafka 高速重试（CPU/日志/DB 压力放大）
	 * - 若底层 consumer 支持 pause/resume，则仅暂停当前分区，其他分区不受影响
	 *
	 * 环境变量：
	 * - `KAFKA_CONSUMER_ERROR_BACKOFF_MS`：失败退避毫秒数（默认 1000，最大 30000）
	 *
	 * @param topic - topic
	 * @param partition - partition
	 * @param heartbeat - 可选 heartbeat（长等待期间保持 group 存活）
	 */
	private async backoffPartitionSafely(
		topic: string,
		partition: number,
		heartbeat?: () => Promise<void>
	): Promise<void> {
		const backoffMs = readKafkaConsumerErrorBackoffMs();
		if (backoffMs <= 0) return;

		const canPause = typeof this.consumer?.pause === 'function' && typeof this.consumer?.resume === 'function';
		if (canPause) {
			try {
				this.consumer!.pause!([{ topic, partitions: [partition] }]);
			} catch (e) {
				const errMsg = e instanceof Error ? e.message : String(e);
				this.logger.warn({ topic, partition, err: errMsg }, '暂停 Kafka 分区失败，将退化为 sleep 退避。');
			}
		}

		await sleepWithHeartbeat(backoffMs, heartbeat);

		if (canPause) {
			try {
				this.consumer!.resume!([{ topic, partitions: [partition] }]);
			} catch (e) {
				const errMsg = e instanceof Error ? e.message : String(e);
				this.logger.warn({ topic, partition, err: errMsg }, '恢复 Kafka 分区失败（将等待自动重平衡恢复）。');
			}
		}
	}
}

/**
 * @description 读取 Kafka Consumer 错误退避毫秒数
 *
 * @returns 退避毫秒数（默认 1000，最大 30000）
 */
function readKafkaConsumerErrorBackoffMs(): number {
	const raw = (process.env.KAFKA_CONSUMER_ERROR_BACKOFF_MS ?? '').trim();
	const parsed = raw.length > 0 ? Number(raw) : 1000;
	if (!Number.isFinite(parsed)) return 1000;
	return Math.max(0, Math.min(30_000, Math.floor(parsed)));
}

/**
 * @description 带心跳的 sleep（避免长等待导致 consumer 心跳超时）
 *
 * @param ms - 等待毫秒数
 * @param heartbeat - 可选心跳函数
 */
async function sleepWithHeartbeat(ms: number, heartbeat?: () => Promise<void>): Promise<void> {
	if (ms <= 0) return;
	if (!heartbeat) {
		await new Promise((r) => setTimeout(r, ms));
		return;
	}

	const step = 1000;
	let remaining = ms;
	while (remaining > 0) {
		const wait = Math.min(step, remaining);
		await new Promise((r) => setTimeout(r, wait));
		remaining -= wait;
		try {
			await heartbeat();
		} catch {
			return;
		}
	}
}
