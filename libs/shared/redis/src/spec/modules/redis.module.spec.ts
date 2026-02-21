import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { setupRedisModule, OksaiRedisRuntimeModule } from '../../lib/modules/redis.module';
import { OKSAI_REDIS } from '../../lib/tokens';
import { OksaiRedisHealthService } from '../../lib/health/redis-health.service';

jest.mock('ioredis', () => {
	return jest.fn().mockImplementation(() => ({
		ping: jest.fn().mockResolvedValue('PONG'),
		quit: jest.fn().mockResolvedValue('OK'),
		disconnect: jest.fn()
	}));
});

describe('setupRedisModule', () => {
	describe('模块配置', () => {
		it('应该返回有效的 DynamicModule', () => {
			const dynamicModule = setupRedisModule({ url: 'redis://localhost:6379' });

			expect(dynamicModule.module).toBe(OksaiRedisRuntimeModule);
			expect(dynamicModule.providers).toBeDefined();
			expect(dynamicModule.exports).toBeDefined();
			expect(dynamicModule.exports).toContain(OKSAI_REDIS);
			expect(dynamicModule.exports).toContain(OksaiRedisHealthService);
		});

		it('应该包含 OksaiRedisHealthService 作为 provider', () => {
			const dynamicModule = setupRedisModule({ url: 'redis://localhost:6379' });

			expect(dynamicModule.providers).toContain(OksaiRedisHealthService);
		});

		it('应该创建带有 ConfigService 依赖的 Redis provider', () => {
			const dynamicModule = setupRedisModule({ url: 'redis://localhost:6379' });

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			);

			expect(redisProvider).toBeDefined();
			expect((redisProvider as any).inject).toContain(ConfigService);
		});
	});

	describe('Redis Provider 工厂函数', () => {
		it('应该使用选项中的 URL 创建 Redis 客户端', () => {
			const Redis = require('ioredis');
			const dynamicModule = setupRedisModule({ url: 'redis://localhost:6379' });

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			) as any;

			const mockConfigService = {
				get: jest.fn()
			};

			redisProvider.useFactory(mockConfigService);

			expect(Redis).toHaveBeenCalledWith(
				'redis://localhost:6379',
				expect.objectContaining({ lazyConnect: false })
			);
		});

		it('应该从 ConfigService 读取 URL', () => {
			const Redis = require('ioredis');
			const dynamicModule = setupRedisModule();

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			) as any;

			const mockConfigService = {
				get: jest.fn((key: string) => {
					if (key === 'redis.url') return 'redis://config:6379';
					return undefined;
				})
			};

			redisProvider.useFactory(mockConfigService);

			expect(Redis).toHaveBeenCalledWith(
				'redis://config:6379',
				expect.objectContaining({ keyPrefix: undefined, lazyConnect: false })
			);
		});

		it('应该在缺少 URL 时抛出错误', () => {
			const dynamicModule = setupRedisModule();

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			) as any;

			const mockConfigService = {
				get: jest.fn().mockReturnValue(undefined)
			};

			expect(() => redisProvider.useFactory(mockConfigService)).toThrow('缺少 Redis 配置');
		});

		it('应该使用选项中的 keyPrefix', () => {
			const Redis = require('ioredis');
			const dynamicModule = setupRedisModule({
				url: 'redis://localhost:6379',
				keyPrefix: 'oksai:'
			});

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			) as any;

			const mockConfigService = {
				get: jest.fn()
			};

			redisProvider.useFactory(mockConfigService);

			expect(Redis).toHaveBeenCalledWith(
				'redis://localhost:6379',
				expect.objectContaining({ keyPrefix: 'oksai:' })
			);
		});

		it('应该从 ConfigService 读取 keyPrefix', () => {
			const Redis = require('ioredis');
			const dynamicModule = setupRedisModule();

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			) as any;

			const mockConfigService = {
				get: jest.fn((key: string) => {
					if (key === 'redis.url') return 'redis://localhost:6379';
					if (key === 'redis.keyPrefix') return 'config-prefix:';
					return undefined;
				})
			};

			redisProvider.useFactory(mockConfigService);

			expect(Redis).toHaveBeenCalledWith(
				'redis://localhost:6379',
				expect.objectContaining({ keyPrefix: 'config-prefix:' })
			);
		});

		it('应该启用 lazyConnect 选项', () => {
			const Redis = require('ioredis');
			const dynamicModule = setupRedisModule({
				url: 'redis://localhost:6379',
				lazyConnect: true
			});

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			) as any;

			const mockConfigService = {
				get: jest.fn()
			};

			redisProvider.useFactory(mockConfigService);

			expect(Redis).toHaveBeenCalledWith(
				'redis://localhost:6379',
				expect.objectContaining({ lazyConnect: true })
			);
		});

		it('lazyConnect 默认为 false', () => {
			const Redis = require('ioredis');
			const dynamicModule = setupRedisModule({ url: 'redis://localhost:6379' });

			const redisProvider = dynamicModule.providers?.find(
				(p: any) => p.provide === OKSAI_REDIS
			) as any;

			const mockConfigService = {
				get: jest.fn()
			};

			redisProvider.useFactory(mockConfigService);

			expect(Redis).toHaveBeenCalledWith(
				'redis://localhost:6379',
				expect.objectContaining({ lazyConnect: false })
			);
		});
	});
});

describe('OksaiRedisRuntimeModule', () => {
	it('应该在模块销毁时调用 quit', async () => {
		const mockQuit = jest.fn().mockResolvedValue('OK');
		const mockRedis = {
			ping: jest.fn().mockResolvedValue('PONG'),
			quit: mockQuit,
			disconnect: jest.fn()
		};

		const Redis = require('ioredis');
		Redis.mockImplementation(() => mockRedis);

		const module = await Test.createTestingModule({
			providers: [
				{
					provide: OKSAI_REDIS,
					useValue: mockRedis
				},
				OksaiRedisRuntimeModule
			]
		}).compile();

		await module.close();

		expect(mockQuit).toHaveBeenCalled();
	});

	it('应该在 quit 失败时调用 disconnect', async () => {
		const mockQuit = jest.fn().mockRejectedValue(new Error('quit failed'));
		const mockDisconnect = jest.fn();
		const mockRedis = {
			ping: jest.fn().mockResolvedValue('PONG'),
			quit: mockQuit,
			disconnect: mockDisconnect
		};

		const Redis = require('ioredis');
		Redis.mockImplementation(() => mockRedis);

		const module = await Test.createTestingModule({
			providers: [
				{
					provide: OKSAI_REDIS,
					useValue: mockRedis
				},
				OksaiRedisRuntimeModule
			]
		}).compile();

		await module.close();

		expect(mockDisconnect).toHaveBeenCalled();
	});
});
