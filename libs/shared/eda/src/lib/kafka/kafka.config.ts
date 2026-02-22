import { ConfigService } from '@oksai/config';

/**
 * @description Kafka 配置接口
 *
 * 设计目标：
 * - 统一 Kafka 配置结构，避免各应用/Worker 各写一套
 * - 默认关闭（`enabled: false`），避免在未建立网络与 ACL 时误连 Kafka
 */
export interface OksaiKafkaConfig {
	enabled: boolean;
	brokers: string[];
	clientId: string;
	topic: string;
	groupId: string;
}

/**
 * @description 从 ConfigService 解析 Kafka 配置
 *
 * 配置键：
 * - `kafka.enabled`：是否启用（默认 false）
 * - `kafka.brokers`：broker 列表（逗号分隔，例如 `localhost:9092`）
 * - `kafka.clientId`：clientId（默认 `oksai`）
 * - `kafka.topic`：topic（默认 `oksai.integration-events`）
 * - `kafka.groupId`：consumer groupId（默认 `oksai.integration-consumer`）
 *
 * @param configService - 配置服务实例
 * @returns Kafka 配置对象
 */
export function parseKafkaConfig(configService: ConfigService): OksaiKafkaConfig {
	const enabledRaw = (configService.get<string>('kafka.enabled') ?? '').trim().toLowerCase();
	const enabled = enabledRaw === 'true' || enabledRaw === '1';

	const brokersRaw = (configService.get<string>('kafka.brokers') ?? '').trim();
	const brokers = brokersRaw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const clientId = (configService.get<string>('kafka.clientId') ?? 'oksai').trim() || 'oksai';
	const topic =
		(configService.get<string>('kafka.topic') ?? 'oksai.integration-events').trim() || 'oksai.integration-events';
	const groupId =
		(configService.get<string>('kafka.groupId') ?? 'oksai.integration-consumer').trim() ||
		'oksai.integration-consumer';

	return { enabled, brokers, clientId, topic, groupId };
}

/**
 * @description 从环境变量解析 Kafka 配置（兼容旧代码，推荐使用 parseKafkaConfig）
 *
 * 环境变量：
 * - `KAFKA_ENABLED`：是否启用（默认 false）
 * - `KAFKA_BROKERS`：broker 列表（逗号分隔，例如 `localhost:9092`）
 * - `KAFKA_CLIENT_ID`：clientId（默认 `oksai`）
 * - `KAFKA_INTEGRATION_TOPIC`：topic（默认 `oksai.integration-events`）
 * - `KAFKA_GROUP_ID`：consumer groupId（默认 `oksai.integration-consumer`）
 *
 * @deprecated 请使用 parseKafkaConfig(configService) 替代
 * @returns Kafka 配置对象
 */
export function parseKafkaEnvConfig(): OksaiKafkaConfig {
	const enabledRaw = (process.env.KAFKA_ENABLED ?? '').trim().toLowerCase();
	const enabled = enabledRaw === 'true' || enabledRaw === '1';

	const brokersRaw = (process.env.KAFKA_BROKERS ?? '').trim();
	const brokers = brokersRaw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const clientId = (process.env.KAFKA_CLIENT_ID ?? 'oksai').trim() || 'oksai';
	const topic =
		(process.env.KAFKA_INTEGRATION_TOPIC ?? 'oksai.integration-events').trim() || 'oksai.integration-events';
	const groupId = (process.env.KAFKA_GROUP_ID ?? 'oksai.integration-consumer').trim() || 'oksai.integration-consumer';

	return { enabled, brokers, clientId, topic, groupId };
}
