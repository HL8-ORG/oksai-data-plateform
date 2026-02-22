import type { OksaiIntegrationEvent } from '@oksai/contracts';
import type { KafkaProducerLike } from './kafka.loader';
import { loadKafkaJs } from './kafka.loader';
import { parseKafkaEnvConfig } from './kafka.config';

/**
 * @description Kafka 日志接口（最小化依赖）
 */
export interface KafkaLogger {
	log(obj: unknown, msg?: string): void;
	warn(obj: unknown, msg?: string): void;
	error(obj: unknown, msg?: string): void;
	debug?(obj: unknown, msg?: string): void;
}

/**
 * @description Kafka 集成事件 Producer 配置选项
 */
export interface KafkaIntegrationEventProducerOptions {
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
	 * @description Kafka topic
	 */
	topic: string;
}

/**
 * @description Kafka 集成事件 Producer（P1：最小可运行）
 *
 * 业务定位：
 * - 用于将 `OksaiIntegrationEvent` 发布到 Kafka topic
 *
 * 注意事项：
 * - `kafkajs` 为 optionalDependencies：仅在 enabled=true 时动态加载
 * - 事件体为 JSON 字符串；message.key 使用 envelope.partitionKey（确保同一 tenant 顺序性）
 */
export class KafkaIntegrationEventProducer {
	private readonly enabled: boolean;
	private readonly topic: string;
	private readonly logger: KafkaLogger;
	private producer: KafkaProducerLike | null = null;

	constructor(private readonly options: KafkaIntegrationEventProducerOptions) {
		this.enabled = options.enabled ?? false;
		this.topic = options.topic;
		this.logger = options.logger;
	}

	/**
	 * @description 从环境变量创建 Producer（默认关闭）
	 *
	 * @param input - 依赖
	 * @param overrides - 覆盖项（例如 topic）
	 * @returns Producer（启用时），否则返回 null
	 */
	static fromEnv(
		input: { logger: KafkaLogger },
		overrides: { topic?: string } = {}
	): KafkaIntegrationEventProducer | null {
		const cfg = parseKafkaEnvConfig();
		if (!cfg.enabled) return null;
		if (!cfg.brokers || cfg.brokers.length === 0) {
			input.logger.warn('已启用 Kafka（KAFKA_ENABLED=true），但未配置 KAFKA_BROKERS，Kafka Producer 未创建。');
			return null;
		}
		const topic = overrides.topic ?? cfg.topic;
		return new KafkaIntegrationEventProducer({
			logger: input.logger,
			enabled: cfg.enabled,
			brokers: cfg.brokers,
			clientId: cfg.clientId,
			topic
		});
	}

	/**
	 * @description 连接 Kafka
	 */
	async connect(): Promise<void> {
		if (!this.enabled) return;
		if (this.producer) return;

		const { Kafka } = loadKafkaJs();
		const kafka = new Kafka({
			clientId: this.options.clientId,
			brokers: this.options.brokers
		});

		this.producer = kafka.producer();
		await this.producer.connect();

		this.logger.log(
			{ clientId: this.options.clientId, brokers: this.options.brokers, topic: this.topic },
			'Kafka Producer 已连接。'
		);
	}

	/**
	 * @description 断开 Kafka 连接
	 */
	async disconnect(): Promise<void> {
		if (!this.producer) return;
		await this.producer.disconnect();
		this.producer = null;
		this.logger.log('Kafka Producer 已断开连接。');
	}

	/**
	 * @description 发布一条集成事件到 Kafka
	 *
	 * @param envelope - 集成事件信封
	 * @throws Error 当未启用或未连接时抛出
	 */
	async publish(envelope: OksaiIntegrationEvent): Promise<void> {
		if (!this.enabled) {
			throw new Error('Kafka Producer 未启用：请设置 KAFKA_ENABLED=true。');
		}
		if (!this.producer) {
			throw new Error('Kafka Producer 未连接：请先调用 connect()。');
		}

		await this.producer.send({
			topic: this.topic,
			messages: [
				{
					key: envelope.partitionKey,
					value: JSON.stringify(envelope),
					headers: {
						'event-id': envelope.eventId,
						'event-name': envelope.eventName,
						'tenant-id': envelope.tenantId
					}
				}
			]
		});
	}
}
