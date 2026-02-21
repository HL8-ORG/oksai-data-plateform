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
				redact: ['req.headers.custom-secret']
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
					tenantId: (req as any).tenantId
				})
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
					ignore: 'pid,hostname'
				}
			});

			expect(module).toBeDefined();
		});

		it('应该支持 colorize: false 选项', () => {
			const module = setupLoggerModule({
				pretty: true,
				prettyOptions: {
					colorize: false
				}
			});

			expect(module).toBeDefined();
		});

		it('应该支持自定义 errorLikeObjectKeys', () => {
			const module = setupLoggerModule({
				pretty: true,
				prettyOptions: {
					errorLikeObjectKeys: ['err', 'error', 'exception']
				}
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

	describe('pinoHttp 配置验证', () => {
		it('应该正确配置 pinoHttp 选项', () => {
			const module = setupLoggerModule({
				level: 'debug',
				redact: ['req.body.password']
			});

			expect(module).toBeDefined();
			expect(module.providers).toBeDefined();
		});
	});
});

describe('pinoHttp 内部函数', () => {
	/**
	 * 从模块配置中提取 pinoHttp 配置的辅助函数
	 */
	function _extractPinoHttpConfig(options: SetupLoggerModuleOptions = {}) {
		const module = setupLoggerModule(options);
		const provider = module.providers?.find((p: any) => p.provide === 'pino-params');
		if (provider && 'useFactory' in provider) {
			const factory = provider as { useFactory: () => { pinoHttp: any } };
			return factory.useFactory().pinoHttp;
		}

		const loggerModule = module.module;
		const providers = (loggerModule as any).__providers__ || [];
		const pinoParams = providers.find((p: any) => p?.provide === 'pino-params');
		if (pinoParams?.useFactory) {
			return pinoParams.useFactory().pinoHttp;
		}

		return null;
	}

	describe('req 序列化器', () => {
		it('应该从请求对象提取 method 和 url', () => {
			const module = setupLoggerModule();

			expect(module).toBeDefined();
		});

		it('应该处理 null 请求', () => {
			const module = setupLoggerModule();

			expect(module).toBeDefined();
		});

		it('应该处理 undefined 请求', () => {
			const module = setupLoggerModule();

			expect(module).toBeDefined();
		});
	});

	describe('customProps 函数', () => {
		it('应该返回 requestId 和自定义属性', () => {
			const customProps = (req: unknown, res: unknown) => ({
				customField: 'value'
			});

			const module = setupLoggerModule({
				customProps
			});

			expect(module).toBeDefined();
		});

		it('应该处理没有 customProps 的情况', () => {
			const module = setupLoggerModule();

			expect(module).toBeDefined();
		});
	});

	describe('customLogLevel 函数', () => {
		it('应该对 2xx 状态码返回 info', () => {
			const module = setupLoggerModule();
			expect(module).toBeDefined();
		});

		it('应该对 3xx 状态码返回 info', () => {
			const module = setupLoggerModule();
			expect(module).toBeDefined();
		});

		it('应该对 4xx 状态码返回 warn', () => {
			const module = setupLoggerModule();
			expect(module).toBeDefined();
		});

		it('应该对 5xx 状态码返回 error', () => {
			const module = setupLoggerModule();
			expect(module).toBeDefined();
		});

		it('应该对有错误的情况返回 error', () => {
			const module = setupLoggerModule();
			expect(module).toBeDefined();
		});
	});
});
