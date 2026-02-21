/**
 * Config 模块单元测试
 *
 * 测试配置管理功能
 */
import { ConfigService, ConfigModule, env, ConfigEnvError } from '../index';

describe('Config', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeAll(() => {
		originalEnv = { ...process.env };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	// ============ env 辅助对象测试 ============
	describe('env 辅助对象', () => {
		beforeEach(() => {
			delete process.env.TEST_VAR;
			delete process.env.PORT;
			delete process.env.DEBUG;
			delete process.env.MODE;
			delete process.env.DATABASE_URL;
			delete process.env.JSON_CONFIG;
			delete process.env.ALLOWED_ORIGINS;
			delete process.env.TIMEOUT;
			delete process.env.FLOAT_VALUE;
		});

		describe('string', () => {
			it('应该读取字符串环境变量', () => {
				process.env.TEST_VAR = 'hello';
				expect(env.string('TEST_VAR')).toBe('hello');
			});

			it('应该使用默认值', () => {
				expect(env.string('NON_EXISTENT', { defaultValue: 'default' })).toBe('default');
			});

			it('缺少必需变量时应该抛出 ConfigEnvError', () => {
				expect(() => env.string('NON_EXISTENT')).toThrow(ConfigEnvError);
				expect(() => env.string('NON_EXISTENT')).toThrow('缺少必需的环境变量');
			});

			it('应该支持 trim 选项', () => {
				process.env.TEST_VAR = '  hello  ';
				expect(env.string('TEST_VAR')).toBe('hello');
				expect(env.string('TEST_VAR', { trim: false })).toBe('  hello  ');
			});
		});

		describe('int', () => {
			it('应该解析整数', () => {
				process.env.PORT = '3000';
				expect(env.int('PORT')).toBe(3000);
			});

			it('应该支持 min/max 校验', () => {
				process.env.PORT = '80';
				expect(env.int('PORT', { min: 1, max: 65535 })).toBe(80);

				process.env.PORT = '0';
				expect(() => env.int('PORT', { min: 1 })).toThrow('不能小于');

				process.env.PORT = '70000';
				expect(() => env.int('PORT', { max: 65535 })).toThrow('不能大于');
			});

			it('非整数应该抛出错误', () => {
				process.env.PORT = 'not-a-number';
				expect(() => env.int('PORT')).toThrow('不是有效整数');
			});
		});

		describe('float', () => {
			it('应该解析浮点数', () => {
				process.env.FLOAT_VALUE = '3.14159';
				expect(env.float('FLOAT_VALUE')).toBeCloseTo(3.14159);
			});

			it('应该支持 min/max 校验', () => {
				process.env.FLOAT_VALUE = '0.5';
				expect(env.float('FLOAT_VALUE', { min: 0, max: 1 })).toBe(0.5);

				process.env.FLOAT_VALUE = '1.5';
				expect(() => env.float('FLOAT_VALUE', { max: 1 })).toThrow('不能大于');
			});
		});

		describe('bool', () => {
			it('应该识别 true/1', () => {
				process.env.DEBUG = 'true';
				expect(env.bool('DEBUG')).toBe(true);
				process.env.DEBUG = '1';
				expect(env.bool('DEBUG')).toBe(true);
			});

			it('应该识别 false/0', () => {
				process.env.DEBUG = 'false';
				expect(env.bool('DEBUG')).toBe(false);
				process.env.DEBUG = '0';
				expect(env.bool('DEBUG')).toBe(false);
			});

			it('无效值应该抛出错误', () => {
				process.env.DEBUG = 'yes';
				expect(() => env.bool('DEBUG')).toThrow('不是有效布尔值');
			});
		});

		describe('enum', () => {
			it('应该返回有效的枚举值', () => {
				process.env.MODE = 'production';
				expect(env.enum('MODE', ['development', 'production'] as const)).toBe('production');
			});

			it('无效值应该抛出错误', () => {
				process.env.MODE = 'staging';
				expect(() => env.enum('MODE', ['development', 'production'] as const)).toThrow('值不合法');
			});
		});

		describe('url', () => {
			it('应该解析有效的 URL', () => {
				process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
				expect(env.url('DATABASE_URL')).toBe('postgresql://localhost:5432/db');
			});

			it('应该校验协议', () => {
				process.env.DATABASE_URL = 'mysql://localhost:3306/db';
				expect(() => env.url('DATABASE_URL', { allowedProtocols: ['postgresql:'] })).toThrow('协议不被允许');
			});

			it('无效 URL 应该抛出错误', () => {
				process.env.DATABASE_URL = 'not-a-url';
				expect(() => env.url('DATABASE_URL')).toThrow('不是有效 URL');
			});
		});

		describe('json', () => {
			it('应该解析有效的 JSON', () => {
				process.env.JSON_CONFIG = '{"name":"test","value":123}';
				const result = env.json<{ name: string; value: number }>('JSON_CONFIG');
				expect(result).toEqual({ name: 'test', value: 123 });
			});

			it('无效 JSON 应该抛出错误', () => {
				process.env.JSON_CONFIG = 'not-json';
				expect(() => env.json('JSON_CONFIG')).toThrow('不是有效 JSON');
			});
		});

		describe('list', () => {
			it('应该解析逗号分隔的列表', () => {
				process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';
				expect(env.list('ALLOWED_ORIGINS')).toEqual(['http://localhost:3000', 'https://example.com']);
			});

			it('应该支持自定义分隔符', () => {
				process.env.ALLOWED_ORIGINS = 'a;b;c';
				expect(env.list('ALLOWED_ORIGINS', { separator: ';' })).toEqual(['a', 'b', 'c']);
			});
		});

		describe('durationMs', () => {
			it('应该解析纯数字（毫秒）', () => {
				process.env.TIMEOUT = '1500';
				expect(env.durationMs('TIMEOUT')).toBe(1500);
			});

			it('应该解析带单位的时长', () => {
				process.env.TIMEOUT = '2s';
				expect(env.durationMs('TIMEOUT')).toBe(2000);

				process.env.TIMEOUT = '5m';
				expect(env.durationMs('TIMEOUT')).toBe(300000);

				process.env.TIMEOUT = '1h';
				expect(env.durationMs('TIMEOUT')).toBe(3600000);

				process.env.TIMEOUT = '1d';
				expect(env.durationMs('TIMEOUT')).toBe(86400000);
			});

			it('应该支持 min/max 校验', () => {
				process.env.TIMEOUT = '100';
				expect(() => env.durationMs('TIMEOUT', { min: 1000 })).toThrow('不能小于');
			});

			it('无效格式应该抛出错误', () => {
				process.env.TIMEOUT = 'invalid';
				expect(() => env.durationMs('TIMEOUT')).toThrow('不是有效时长');
			});
		});

		describe('getSafeXxx 方法', () => {
			it('getSafeInt 应该返回 Result', () => {
				process.env.PORT = '3000';
				const result = env.getSafeInt('PORT');
				expect(result.isOk()).toBe(true);
				expect(result.value).toBe(3000);
			});

			it('getSafeInt 失败时应该返回 Fail', () => {
				delete process.env.PORT;
				const result = env.getSafeInt('PORT');
				expect(result.isFail()).toBe(true);
				expect(result.error).toContain('缺少必需的环境变量');
			});

			it('getSafeJson 应该返回 Result', () => {
				process.env.JSON_CONFIG = '{"a":1}';
				const result = env.getSafeJson<{ a: number }>('JSON_CONFIG');
				expect(result.isOk()).toBe(true);
				expect(result.value).toEqual({ a: 1 });
			});
		});
	});

	// ============ ConfigService 测试 ============
	describe('ConfigService', () => {
		let service: ConfigService;

		beforeEach(() => {
			delete process.env.NODE_ENV;
			delete process.env.DATABASE_URL;
			delete process.env.PORT;
			delete process.env.DEBUG;
			delete process.env.TEST_VAR;
			delete process.env.REQUIRED_VAR;
			delete process.env.JSON_CONFIG;
			delete process.env.LOG_LEVEL;
			delete process.env.FLOAT_VALUE;
			delete process.env.INT_VALUE;
			delete process.env.NEGATIVE_VALUE;
			delete process.env.ALLOWED_ORIGINS;
			delete process.env.TIMEOUT;

			service = new ConfigService();
		});

		afterEach(() => {
			service.clearCache();
		});

		describe('get', () => {
			it('应该获取环境变量值', () => {
				process.env.TEST_VAR = 'test_value';
				expect(service.get('TEST_VAR')).toBe('test_value');
			});

			it('环境变量不存在时应该返回默认值', () => {
				expect(service.get('NON_EXISTENT', { defaultValue: 'default' })).toBe('default');
			});

			it('应该缓存读取结果', () => {
				process.env.TEST_VAR = 'cached_value';
				expect(service.get('TEST_VAR')).toBe('cached_value');

				process.env.TEST_VAR = 'new_value';
				expect(service.get('TEST_VAR')).toBe('cached_value');
			});

			it('禁用缓存时应该每次读取最新值', () => {
				const noCacheService = new ConfigService({ enableCache: false });
				process.env.TEST_VAR = 'first_value';
				expect(noCacheService.get('TEST_VAR')).toBe('first_value');

				process.env.TEST_VAR = 'second_value';
				expect(noCacheService.get('TEST_VAR')).toBe('second_value');
			});
		});

		describe('getRequired', () => {
			it('应该获取必需的环境变量', () => {
				process.env.REQUIRED_VAR = 'required_value';
				expect(service.getRequired('REQUIRED_VAR')).toBe('required_value');
			});

			it('必需变量不存在时应该抛出异常', () => {
				expect(() => service.getRequired('NON_EXISTENT')).toThrow('缺少必需的环境变量');
			});
		});

		describe('getInt', () => {
			it('应该获取整数类型的环境变量', () => {
				process.env.PORT = '3000';
				expect(service.getInt('PORT')).toBe(3000);
			});

			it('应该支持默认值', () => {
				expect(service.getInt('PORT', { defaultValue: 8080 })).toBe(8080);
			});

			it('应该支持 min/max 校验', () => {
				process.env.PORT = '80';
				expect(service.getInt('PORT', { min: 1, max: 65535 })).toBe(80);

				service.clearCache();
				process.env.PORT = '0';
				expect(() => service.getInt('PORT', { min: 1 })).toThrow('不能小于');
			});

			it('非数字值应该抛出错误', () => {
				process.env.PORT = 'not-a-number';
				expect(() => service.getInt('PORT')).toThrow('不是有效整数');
			});
		});

		describe('getFloat', () => {
			it('应该获取浮点数', () => {
				process.env.FLOAT_VALUE = '3.14159';
				expect(service.getFloat('FLOAT_VALUE')).toBeCloseTo(3.14159);
			});

			it('应该支持 min/max 校验', () => {
				process.env.FLOAT_VALUE = '0.5';
				expect(service.getFloat('FLOAT_VALUE', { min: 0, max: 1 })).toBe(0.5);
			});
		});

		describe('getNumber (兼容旧 API)', () => {
			it('应该获取数字类型的环境变量', () => {
				process.env.PORT = '3000';
				expect(service.getNumber('PORT')).toBe(3000);
			});

			it('应该支持默认值', () => {
				expect(service.getNumber('PORT', 8080)).toBe(8080);
			});
		});

		describe('getBool', () => {
			it('应该识别 true 值', () => {
				process.env.DEBUG = 'true';
				expect(service.getBool('DEBUG')).toBe(true);
			});

			it('应该识别 false 值', () => {
				process.env.DEBUG = 'false';
				expect(service.getBool('DEBUG')).toBe(false);
			});

			it('应该支持默认值', () => {
				expect(service.getBool('DEBUG', { defaultValue: true })).toBe(true);
			});
		});

		describe('getBoolean (兼容旧 API)', () => {
			it('应该识别 true 值', () => {
				process.env.DEBUG = 'true';
				expect(service.getBoolean('DEBUG')).toBe(true);
			});

			it('应该支持默认值', () => {
				expect(service.getBoolean('DEBUG', true)).toBe(true);
			});
		});

		describe('getEnum', () => {
			it('应该返回有效的枚举值', () => {
				process.env.LOG_LEVEL = 'debug';
				expect(service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'])).toBe('debug');
			});

			it('无效值应该使用默认值', () => {
				process.env.LOG_LEVEL = 'trace';
				expect(service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], { defaultValue: 'info' })).toBe(
					'info'
				);
			});

			it('未设置时应该使用默认值', () => {
				expect(service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], { defaultValue: 'info' })).toBe(
					'info'
				);
			});
		});

		describe('getUrl', () => {
			it('应该解析有效的 URL', () => {
				process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
				expect(service.getUrl('DATABASE_URL')).toBe('postgresql://localhost:5432/db');
			});

			it('应该校验协议', () => {
				process.env.DATABASE_URL = 'mysql://localhost:3306/db';
				expect(() => service.getUrl('DATABASE_URL', { allowedProtocols: ['postgresql:'] })).toThrow(
					'协议不被允许'
				);
			});
		});

		describe('getJson', () => {
			it('应该解析有效的 JSON', () => {
				process.env.JSON_CONFIG = '{"name":"test","value":123}';
				const result = service.getJson<{ name: string; value: number }>('JSON_CONFIG', {
					defaultValue: { name: '', value: 0 }
				});
				expect(result).toEqual({ name: 'test', value: 123 });
			});

			it('应该解析 JSON 数组', () => {
				process.env.JSON_CONFIG = '["a","b","c"]';
				const result = service.getJson<string[]>('JSON_CONFIG', { defaultValue: [] });
				expect(result).toEqual(['a', 'b', 'c']);
			});

			it('无效 JSON 应该使用默认值', () => {
				process.env.JSON_CONFIG = 'not-valid-json';
				const result = service.getJson('JSON_CONFIG', { defaultValue: { default: true } });
				expect(result).toEqual({ default: true });
			});

			it('未设置时应该使用默认值', () => {
				const result = service.getJson('JSON_CONFIG', { defaultValue: { default: true } });
				expect(result).toEqual({ default: true });
			});
		});

		describe('getSafeJson', () => {
			it('应该返回 Ok 结果', () => {
				process.env.JSON_CONFIG = '{"name":"test"}';
				const result = service.getSafeJson<{ name: string }>('JSON_CONFIG');
				expect(result.isOk()).toBe(true);
				expect(result.value).toEqual({ name: 'test' });
			});

			it('未设置时应该返回 Fail', () => {
				const result = service.getSafeJson('JSON_CONFIG');
				expect(result.isFail()).toBe(true);
				expect(result.error).toContain('缺少必需的环境变量');
			});

			it('无效 JSON 应该返回 Fail', () => {
				process.env.JSON_CONFIG = '{invalid}';
				const result = service.getSafeJson('JSON_CONFIG');
				expect(result.isFail()).toBe(true);
				expect(result.error).toContain('不是有效 JSON');
			});
		});

		describe('getList', () => {
			it('应该解析逗号分隔的列表', () => {
				process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';
				expect(service.getList('ALLOWED_ORIGINS')).toEqual(['http://localhost:3000', 'https://example.com']);
			});

			it('应该支持自定义分隔符', () => {
				process.env.ALLOWED_ORIGINS = 'a;b;c';
				expect(service.getList('ALLOWED_ORIGINS', { separator: ';' })).toEqual(['a', 'b', 'c']);
			});

			it('应该支持默认值', () => {
				expect(service.getList('ALLOWED_ORIGINS', { defaultValue: ['*'] })).toEqual(['*']);
			});
		});

		describe('getDurationMs', () => {
			it('应该解析纯数字（毫秒）', () => {
				process.env.TIMEOUT = '1500';
				expect(service.getDurationMs('TIMEOUT')).toBe(1500);
			});

			it('应该解析带单位的时长', () => {
				process.env.TIMEOUT = '2s';
				expect(service.getDurationMs('TIMEOUT')).toBe(2000);

				service.clearCache();
				process.env.TIMEOUT = '5m';
				expect(service.getDurationMs('TIMEOUT')).toBe(300000);

				service.clearCache();
				process.env.TIMEOUT = '1h';
				expect(service.getDurationMs('TIMEOUT')).toBe(3600000);

				service.clearCache();
				process.env.TIMEOUT = '1d';
				expect(service.getDurationMs('TIMEOUT')).toBe(86400000);
			});

			it('应该支持默认值', () => {
				expect(service.getDurationMs('TIMEOUT', { defaultValue: 5000 })).toBe(5000);
			});

			it('应该支持 min/max 校验', () => {
				process.env.TIMEOUT = '100';
				expect(() => service.getDurationMs('TIMEOUT', { min: 1000 })).toThrow('不能小于');
			});
		});

		describe('环境检测', () => {
			it('应该返回当前 Node 环境', () => {
				process.env.NODE_ENV = 'production';
				expect(service.getNodeEnv()).toBe('production');
			});

			it('未设置时应该返回 development', () => {
				expect(service.getNodeEnv()).toBe('development');
			});

			it('isProduction 应该正确判断', () => {
				process.env.NODE_ENV = 'production';
				expect(service.isProduction()).toBe(true);
				expect(service.isDevelopment()).toBe(false);
			});

			it('isDevelopment 应该正确判断', () => {
				process.env.NODE_ENV = 'development';
				expect(service.isDevelopment()).toBe(true);
				expect(service.isProduction()).toBe(false);
			});

			it('isTest 应该正确判断', () => {
				process.env.NODE_ENV = 'test';
				expect(service.isTest()).toBe(true);
			});
		});

		describe('缓存控制', () => {
			it('clearCache 应该清除所有缓存', () => {
				process.env.TEST_VAR = 'value1';
				expect(service.get('TEST_VAR')).toBe('value1');

				service.clearCache();

				process.env.TEST_VAR = 'value2';
				expect(service.get('TEST_VAR')).toBe('value2');
			});

			it('clearCacheFor 应该清除指定 key 的缓存', () => {
				process.env.PORT = '3000';
				process.env.DEBUG = 'true';

				service.getInt('PORT');
				service.getBool('DEBUG');

				service.clearCacheFor('PORT');

				process.env.PORT = '4000';
				expect(service.getInt('PORT')).toBe(4000);

				process.env.DEBUG = 'false';
				expect(service.getBool('DEBUG')).toBe(true);
			});
		});
	});

	// ============ ConfigModule 测试 ============
	describe('ConfigModule', () => {
		it('应该提供 ConfigService', () => {
			const module = ConfigModule.forRoot();
			expect(module).toBeDefined();
			expect(module.exports).toContain(ConfigService);
		});

		it('应该支持 isGlobal 选项', () => {
			const module = ConfigModule.forRoot({ isGlobal: false });
			expect(module.global).toBe(false);
		});

		it('应该支持 configOptions 选项', () => {
			const module = ConfigModule.forRoot({
				configOptions: { enableCache: false }
			});
			expect(module).toBeDefined();
		});

		it('forRootAsync 应该支持异步工厂', () => {
			const module = ConfigModule.forRootAsync({
				useFactory: async () => ({ enableCache: true }),
				isGlobal: true
			});
			expect(module).toBeDefined();
			expect(module.global).toBe(true);
		});

		it('forRootAsync 应该创建 ConfigService 实例', async () => {
			const module = ConfigModule.forRootAsync({
				useFactory: async () => ({ enableCache: false }),
				isGlobal: false
			});

			expect(module.providers).toBeDefined();
			const provider = module.providers?.[0] as {
				provide: typeof ConfigService;
				useFactory: () => Promise<ConfigService>;
			};
			expect(provider.provide).toBe(ConfigService);

			const service = await provider.useFactory();
			expect(service).toBeInstanceOf(ConfigService);
		});
	});
});
