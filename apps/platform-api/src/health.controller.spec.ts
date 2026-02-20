import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
	let controller: HealthController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
		}).compile();

		controller = module.get<HealthController>(HealthController);
	});

	describe('check', () => {
		it('应该返回健康状态', () => {
			const result = controller.check();

			expect(result.status).toBe('ok');
			expect(result.service).toBe('@oksai/platform-api');
			expect(result.timestamp).toBeDefined();
		});
	});

	describe('ready', () => {
		it('应该返回就绪状态', () => {
			const result = controller.ready();

			expect(result.ready).toBe(true);
		});
	});
});
