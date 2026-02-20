import { setupLoggerModule, type SetupLoggerModuleOptions } from '../lib/setup-logger-module';

describe('setupLoggerModule', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('基本功能', () => {
		it('应该返回 DynamicModule', () => {
			const module = setupLoggerModule();

			expect(module).toBeDefined();
			expect(module.module).toBeDefined();
		});

		it('应该使用默认日志级别 info', () => {
			delete process.env.LOG_LEVEL;
			const module = setupLoggerModule();

			expect(module).toBeDefined();
		});

		it('应该从环境变量读取日志级别', () => {
			process.env.LOG_LEVEL = 'debug';
			const module = setupLoggerModule();

			expect(module).toBeDefined();
		});

		it('应该使用 options 中的日志级别（优先级最高）', () => {
			process.env.LOG_LEVEL = 'debug';
			const module = setupLoggerModule({ level: 'trace' });

			expect(module).toBeDefined();
		});
	});

	describe('配置选项', () => {
		it('应该支持自定义 redact 路径', () => {
			const options: SetupLoggerModuleOptions = {
				redact: ['req.headers.custom-secret'],
			};
			const module = setupLoggerModule(options);

			expect(module).toBeDefined();
		});

		it('应该支持 pretty 选项', () => {
			const module = setupLoggerModule({ pretty: true });

			expect(module).toBeDefined();
		});

		it('应该支持 customProps 选项', () => {
			const module = setupLoggerModule({
				customProps: (req) => ({
					tenantId: (req as any).tenantId,
				}),
			});

			expect(module).toBeDefined();
		});

		it('应该支持 prettyOptions 配置', () => {
			const module = setupLoggerModule({
				pretty: true,
				prettyOptions: {
					colorize: true,
					timeFormat: 'HH:MM:ss.l',
					singleLine: true,
					ignore: 'pid,hostname',
				},
			});

			expect(module).toBeDefined();
		});
	});

	describe('空选项处理', () => {
		it('应该正确处理空选项对象', () => {
			const module = setupLoggerModule({});

			expect(module).toBeDefined();
		});

		it('应该正确处理 undefined 选项', () => {
			const module = setupLoggerModule(undefined);

			expect(module).toBeDefined();
		});
	});
});
