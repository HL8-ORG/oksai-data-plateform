import { Test, TestingModule } from '@nestjs/testing';
import { OksaiRedisHealthService } from '../../lib/health/redis-health.service';
import { OKSAI_REDIS } from '../../lib/tokens';

describe('OksaiRedisHealthService', () => {
	let service: OksaiRedisHealthService;
	let mockRedis: { ping: jest.Mock };

	beforeEach(async () => {
		mockRedis = {
			ping: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OksaiRedisHealthService,
				{
					provide: OKSAI_REDIS,
					useValue: mockRedis
				}
			]
		}).compile();

		service = module.get<OksaiRedisHealthService>(OksaiRedisHealthService);
	});

	describe('ping', () => {
		it('应该在 PONG 时返回成功结果', async () => {
			mockRedis.ping.mockResolvedValue('PONG');

			const result = await service.ping();

			expect(result.ok).toBe(true);
			expect(result.latencyMs).toBeGreaterThanOrEqual(0);
			expect(result.error).toBeUndefined();
		});

		it('应该在非 PONG 响应时返回失败', async () => {
			mockRedis.ping.mockResolvedValue('OTHER');

			const result = await service.ping();

			expect(result.ok).toBe(false);
			expect(result.latencyMs).toBeGreaterThanOrEqual(0);
		});

		it('应该在 Redis 错误时返回失败结果', async () => {
			mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

			const result = await service.ping();

			expect(result.ok).toBe(false);
			expect(result.latencyMs).toBeGreaterThanOrEqual(0);
			expect(result.error).toBe('Connection refused');
		});

		it('应该在非 Error 对象错误时返回字符串形式', async () => {
			mockRedis.ping.mockRejectedValue('String error');

			const result = await service.ping();

			expect(result.ok).toBe(false);
			expect(result.error).toBe('String error');
		});

		it('应该正确计算延迟', async () => {
			mockRedis.ping.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => resolve('PONG'), 10);
				});
			});

			const result = await service.ping();

			expect(result.ok).toBe(true);
			expect(result.latencyMs).toBeGreaterThanOrEqual(10);
		});
	});
});
