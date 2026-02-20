import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { SystemController } from './system.controller';

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
			expect(result.service).toBe('@oksai/platform-admin-api');
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

describe('SystemController', () => {
	let controller: SystemController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SystemController],
		}).compile();

		controller = module.get<SystemController>(SystemController);
	});

	describe('getInfo', () => {
		it('应该返回系统信息', () => {
			const result = controller.getInfo();

			expect(result.name).toBe('oksai-data-platform');
			expect(result.version).toBe('0.1.0');
			expect(result.nodeVersion).toBeDefined();
			expect(result.platform).toBeDefined();
			expect(typeof result.uptime).toBe('number');
		});
	});

	describe('getEnv', () => {
		it('应该返回环境信息', () => {
			const result = controller.getEnv();

			expect(result.nodeEnv).toBeDefined();
			expect(result.tz).toBeDefined();
		});
	});
});
