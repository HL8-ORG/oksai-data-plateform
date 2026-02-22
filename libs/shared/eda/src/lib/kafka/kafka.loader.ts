/**
 * @description kafkajs 动态加载器（可选依赖）
 *
 * 设计目标：
 * - `kafkajs` 作为 optionalDependencies：未安装时不影响服务启动与编译
 * - 仅在显式启用 Kafka 传输层时才进行 require，避免"隐式引入 MQ"
 *
 * 注意事项：
 * - 本项目服务端产物以 CommonJS 语义运行，因此这里使用 `require()` 动态加载
 */
export interface KafkaProducerLike {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	send: (input: unknown) => Promise<unknown>;
}

export interface KafkaConsumerLike {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	subscribe: (input: unknown) => Promise<void>;
	run: (input: unknown) => Promise<void>;
	commitOffsets?: (input: unknown) => Promise<void>;
	pause?: (input: unknown) => void;
	resume?: (input: unknown) => void;
}

export interface KafkaClientLike {
	producer: () => KafkaProducerLike;
	consumer: (input: { groupId: string }) => KafkaConsumerLike;
}

export interface KafkaJsModuleLike {
	Kafka: new (input: { clientId: string; brokers: string[] }) => KafkaClientLike;
}

/**
 * @description 动态 require（可被单测 mock）
 *
 * @param moduleName - 模块名
 * @returns 模块导出
 */
export function dynamicRequire(moduleName: string): unknown {
	return require(moduleName);
}

/**
 * @description 加载 kafkajs（若未安装则抛出中文错误）
 *
 * @returns kafkajs 模块
 * @throws Error 当 kafkajs 未安装或加载失败时抛出
 */
export function loadKafkaJs(): KafkaJsModuleLike {
	try {
		return dynamicRequire('kafkajs') as KafkaJsModuleLike;
	} catch (e) {
		const errMsg = e instanceof Error ? e.message : String(e);
		throw new Error(`Kafka 传输层启用失败：未安装或无法加载依赖 kafkajs。原始错误：${errMsg}`);
	}
}
