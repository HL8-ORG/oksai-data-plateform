import { createPollingWorker, readOptionalBooleanFromEnv } from './polling-worker';

describe('createPollingWorker', () => {
	const logger = {
		log: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	} as any;

	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		delete process.env.WORKER_ENABLED;
		delete process.env.WORKER_POLL_INTERVAL_MS;
		delete process.env.WORKER_BATCH_SIZE;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('readOptionalBooleanFromEnv should return undefined when missing/invalid', () => {
		expect(readOptionalBooleanFromEnv('MISSING_BOOL', process.env)).toBeUndefined();
		process.env.MISSING_BOOL = '???';
		expect(readOptionalBooleanFromEnv('MISSING_BOOL', process.env)).toBeUndefined();
	});

	it('readOptionalBooleanFromEnv should parse true/1/false/0', () => {
		process.env.BOOL_X = 'true';
		expect(readOptionalBooleanFromEnv('BOOL_X', process.env)).toBe(true);
		process.env.BOOL_X = '1';
		expect(readOptionalBooleanFromEnv('BOOL_X', process.env)).toBe(true);
		process.env.BOOL_X = 'false';
		expect(readOptionalBooleanFromEnv('BOOL_X', process.env)).toBe(false);
		process.env.BOOL_X = '0';
		expect(readOptionalBooleanFromEnv('BOOL_X', process.env)).toBe(false);
	});

	it('should not start when disabled', () => {
		process.env.WORKER_ENABLED = 'false';
		const tick = jest.fn();

		const worker = createPollingWorker({ workerName: 'W1', logger, tick: tick as any });
		worker.start();

		expect(logger.log).toHaveBeenCalledWith('W1 已禁用（WORKER_ENABLED=false）。');
		jest.advanceTimersByTime(5000);
		expect(tick).not.toHaveBeenCalled();
	});

	it('should start and call tick with safe batchSize', async () => {
		process.env.WORKER_ENABLED = 'true';
		process.env.WORKER_POLL_INTERVAL_MS = '200';
		process.env.WORKER_BATCH_SIZE = '10';

		const tick = jest.fn().mockResolvedValue(undefined);
		const worker = createPollingWorker({ workerName: 'W2', logger, tick });
		worker.start();

		expect(logger.log).toHaveBeenCalledWith('W2 已启用，轮询间隔 200ms。');

		jest.advanceTimersByTime(200);
		await Promise.resolve();
		expect(tick).toHaveBeenCalledWith(10);

		worker.stop();
	});

	it('should treat WORKER_ENABLED=1 as enabled', async () => {
		process.env.WORKER_ENABLED = '1';
		process.env.WORKER_POLL_INTERVAL_MS = '200';
		process.env.WORKER_BATCH_SIZE = '10';

		const tick = jest.fn().mockResolvedValue(undefined);
		const worker = createPollingWorker({ workerName: 'W4', logger, tick });
		worker.start();

		expect(logger.log).toHaveBeenCalledWith('W4 已启用，轮询间隔 200ms。');

		jest.advanceTimersByTime(200);
		await Promise.resolve();
		expect(tick).toHaveBeenCalledWith(10);
	});

	it('should fallback invalid interval/batchSize to defaults', async () => {
		process.env.WORKER_ENABLED = 'true';
		process.env.WORKER_POLL_INTERVAL_MS = '1';
		process.env.WORKER_BATCH_SIZE = '9999';

		const tick = jest.fn().mockResolvedValue(undefined);
		const worker = createPollingWorker({ workerName: 'W3', logger, tick });
		worker.start();

		expect(logger.log).toHaveBeenCalledWith('W3 已启用，轮询间隔 1000ms。');

		jest.advanceTimersByTime(1000);
		await Promise.resolve();

		expect(tick).toHaveBeenCalledWith(10);
	});
});
