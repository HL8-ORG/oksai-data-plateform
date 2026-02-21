import { getRedisConfig } from '../lib/config/redis.config';

describe('getRedisConfig', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('REDIS_URL', () => {
		it('缺少 REDIS_URL 时应该抛出错误', () => {
			delete process.env.REDIS_URL;

			expect(() => getRedisConfig()).toThrow('缺少必需的环境变量：REDIS_URL');
		});

		it('应该正确读取 REDIS_URL', () => {
			process.env.REDIS_URL = 'redis://localhost:6379/0';

			const config = getRedisConfig();

			expect(config.url).toBe('redis://localhost:6379/0');
		});
	});

	describe('REDIS_KEY_PREFIX', () => {
		it('应该正确读取 REDIS_KEY_PREFIX', () => {
			process.env.REDIS_URL = 'redis://localhost:6379/0';
			process.env.REDIS_KEY_PREFIX = 'oksai:';

			const config = getRedisConfig();

			expect(config.keyPrefix).toBe('oksai:');
		});

		it('REDIS_KEY_PREFIX 为空时应该返回 undefined', () => {
			process.env.REDIS_URL = 'redis://localhost:6379/0';
			delete process.env.REDIS_KEY_PREFIX;

			const config = getRedisConfig();

			expect(config.keyPrefix).toBeUndefined();
		});

		it('REDIS_KEY_PREFIX 只有空格时应该返回 undefined', () => {
			process.env.REDIS_URL = 'redis://localhost:6379/0';
			process.env.REDIS_KEY_PREFIX = '   ';

			const config = getRedisConfig();

			expect(config.keyPrefix).toBeUndefined();
		});
	});
});
