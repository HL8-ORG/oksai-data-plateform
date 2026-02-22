import { KafkaIntegrationEventConsumer } from './kafka-event-consumer';

describe('KafkaIntegrationEventConsumer.fromEnv', () => {
	const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() } as any;

	const OLD_ENV = process.env;
	beforeEach(() => {
		jest.resetModules();
		process.env = { ...OLD_ENV };
		logger.error.mockClear();
		logger.log.mockClear();
		logger.warn.mockClear();
		logger.debug.mockClear();
	});
	afterAll(() => {
		process.env = OLD_ENV;
	});

	it('should return null when KAFKA_ENABLED is false', () => {
		process.env.KAFKA_ENABLED = 'false';
		const c = KafkaIntegrationEventConsumer.fromEnv({ logger });
		expect(c).toBeNull();
	});

	it('should return null and warn when enabled but brokers are missing', () => {
		process.env.KAFKA_ENABLED = 'true';
		process.env.KAFKA_BROKERS = '';
		const c = KafkaIntegrationEventConsumer.fromEnv({ logger });
		expect(c).toBeNull();
		expect(logger.warn).toHaveBeenCalled();
	});

	it('should allow overriding groupId and topic', () => {
		process.env.KAFKA_ENABLED = 'true';
		process.env.KAFKA_BROKERS = 'localhost:9092';
		const c = KafkaIntegrationEventConsumer.fromEnv({ logger }, { groupId: 'custom-group', topic: 'custom.topic' });
		expect(c).not.toBeNull();
	});
});
