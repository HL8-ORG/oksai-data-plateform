/**
 * Config 模块单元测试
 *
 * 测试配置管理功能
 */
import { ConfigService, ConfigModule } from '../index';

describe('Config', () => {
	describe('ConfigService', () => {
		let service: ConfigService;

		beforeEach(() => {
			// 重置环境变量
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

			service = new ConfigService();
		});

		afterEach(() => {
			service.clearCache();
		});

		describe('get', () => {
			it('应该获取环境变量值', () => {
				process.env.TEST_VAR = 'test_value';
				const value = service.get('TEST_VAR');
				expect(value).toBe('test_value');
			});

			it('环境变量不存在时应该返回默认值', () => {
				const value = service.get('NON_EXISTENT', 'default');
				expect(value).toBe('default');
			});

			it('环境变量不存在且无默认值时应该返回 undefined', () => {
				const value = service.get('NON_EXISTENT');
				expect(value).toBeUndefined();
			});

			it('应该缓存读取结果', () => {
				process.env.TEST_VAR = 'cached_value';
				const value1 = service.get('TEST_VAR');
				expect(value1).toBe('cached_value');

				// 修改环境变量，缓存应该返回旧值
				process.env.TEST_VAR = 'new_value';
				const value2 = service.get('TEST_VAR');
				expect(value2).toBe('cached_value');
			});

			it('禁用缓存时应该每次读取最新值', () => {
				const noCacheService = new ConfigService({ enableCache: false });
				process.env.TEST_VAR = 'first_value';
				const value1 = noCacheService.get('TEST_VAR');
				expect(value1).toBe('first_value');

				process.env.TEST_VAR = 'second_value';
				const value2 = noCacheService.get('TEST_VAR');
				expect(value2).toBe('second_value');
			});
		});

		describe('getRequired', () => {
			it('应该获取必需的环境变量', () => {
				process.env.REQUIRED_VAR = 'required_value';
				const value = service.getRequired('REQUIRED_VAR');
				expect(value).toBe('required_value');
			});

			it('必需变量不存在时应该抛出异常', () => {
				expect(() => service.getRequired('NON_EXISTENT')).toThrow('配置项 NON_EXISTENT 是必需的，但未设置');
			});
		});

		describe('getNumber', () => {
			it('应该获取数字类型的环境变量', () => {
				process.env.PORT = '3000';
				const value = service.getNumber('PORT');
				expect(value).toBe(3000);
			});

			it('应该支持默认值', () => {
				const value = service.getNumber('PORT', 8080);
				expect(value).toBe(8080);
			});

			it('非数字值应该返回 NaN', () => {
				process.env.PORT = 'not-a-number';
				const value = service.getNumber('PORT');
				expect(Number.isNaN(value)).toBe(true);
			});

			it('无默认值且无环境变量时应该返回 NaN', () => {
				const value = service.getNumber('NON_EXISTENT');
				expect(Number.isNaN(value)).toBe(true);
			});

			it('应该正确解析负数', () => {
				process.env.NEGATIVE_VALUE = '-100';
				const value = service.getNumber('NEGATIVE_VALUE');
				expect(value).toBe(-100);
			});

			it('应该正确解析浮点数', () => {
				process.env.FLOAT_VALUE = '3.14159';
				const value = service.getNumber('FLOAT_VALUE');
				expect(value).toBeCloseTo(3.14159);
			});

			it('应该正确解析科学计数法', () => {
				process.env.FLOAT_VALUE = '1e5';
				const value = service.getNumber('FLOAT_VALUE');
				expect(value).toBe(100000);
			});

			it('空字符串应该返回 0', () => {
				process.env.PORT = '';
				const value = service.getNumber('PORT');
				expect(value).toBe(0);
			});

			it('应该缓存数字解析结果', () => {
				process.env.PORT = '3000';
				const value1 = service.getNumber('PORT');
				expect(value1).toBe(3000);

				process.env.PORT = '4000';
				const value2 = service.getNumber('PORT');
				expect(value2).toBe(3000); // 返回缓存值
			});
		});

		describe('getSafeNumber', () => {
			it('应该返回 Ok 结果', () => {
				process.env.PORT = '3000';
				const result = service.getSafeNumber('PORT', 8080);
				expect(result.isOk()).toBe(true);
				expect(result.value).toBe(3000);
			});

			it('无环境变量时应该使用默认值', () => {
				const result = service.getSafeNumber('PORT', 8080);
				expect(result.isOk()).toBe(true);
				expect(result.value).toBe(8080);
			});

			it('无环境变量且无默认值时应该返回 Fail', () => {
				const result = service.getSafeNumber('NON_EXISTENT');
				expect(result.isFail()).toBe(true);
				expect(result.error).toContain('未设置且无默认值');
			});

			it('非数字值应该返回 Fail', () => {
				process.env.PORT = 'not-a-number';
				const result = service.getSafeNumber('PORT');
				expect(result.isFail()).toBe(true);
				expect(result.error).toContain('不是有效的数字');
			});
		});

		describe('getInt', () => {
			it('应该返回整数部分', () => {
				process.env.INT_VALUE = '42.9';
				const value = service.getInt('INT_VALUE');
				expect(value).toBe(42);
			});

			it('负数应该向零截断', () => {
				process.env.INT_VALUE = '-42.9';
				const value = service.getInt('INT_VALUE');
				expect(value).toBe(-42);
			});
		});

		describe('getFloat', () => {
			it('应该返回浮点数', () => {
				process.env.FLOAT_VALUE = '3.14159';
				const value = service.getFloat('FLOAT_VALUE');
				expect(value).toBeCloseTo(3.14159);
			});
		});

		describe('getBoolean', () => {
			it('应该识别 true 值', () => {
				process.env.DEBUG = 'true';
				const value = service.getBoolean('DEBUG');
				expect(value).toBe(true);
			});

			it('应该识别 TRUE 值（大写）', () => {
				process.env.DEBUG = 'TRUE';
				const value = service.getBoolean('DEBUG');
				expect(value).toBe(true);
			});

			it('应该识别 True 值（混合大小写）', () => {
				process.env.DEBUG = 'True';
				const value = service.getBoolean('DEBUG');
				expect(value).toBe(true);
			});

			it('应该识别 false 值', () => {
				process.env.DEBUG = 'false';
				const value = service.getBoolean('DEBUG');
				expect(value).toBe(false);
			});

			it('非 true 值应该返回 false', () => {
				process.env.DEBUG = 'yes';
				const value = service.getBoolean('DEBUG');
				expect(value).toBe(false);
			});

			it('应该支持默认值', () => {
				const value = service.getBoolean('DEBUG', true);
				expect(value).toBe(true);
			});

			it('无默认值时应该返回 false', () => {
				const value = service.getBoolean('DEBUG');
				expect(value).toBe(false);
			});

			it('应该缓存布尔解析结果', () => {
				process.env.DEBUG = 'true';
				const value1 = service.getBoolean('DEBUG');
				expect(value1).toBe(true);

				process.env.DEBUG = 'false';
				const value2 = service.getBoolean('DEBUG');
				expect(value2).toBe(true); // 返回缓存值
			});
		});

		describe('getJson', () => {
			it('应该解析有效的 JSON', () => {
				process.env.JSON_CONFIG = '{"name":"test","value":123}';
				const result = service.getJson<{ name: string; value: number }>('JSON_CONFIG', { name: '', value: 0 });
				expect(result).toEqual({ name: 'test', value: 123 });
			});

			it('应该解析 JSON 数组', () => {
				process.env.JSON_CONFIG = '["a","b","c"]';
				const result = service.getJson<string[]>('JSON_CONFIG', []);
				expect(result).toEqual(['a', 'b', 'c']);
			});

			it('无效 JSON 应该返回默认值', () => {
				process.env.JSON_CONFIG = 'not-valid-json';
				const result = service.getJson('JSON_CONFIG', { default: true });
				expect(result).toEqual({ default: true });
			});

			it('未设置时应该返回默认值', () => {
				const result = service.getJson('JSON_CONFIG', { default: true });
				expect(result).toEqual({ default: true });
			});

			it('应该缓存 JSON 解析结果', () => {
				process.env.JSON_CONFIG = '{"cached":true}';
				const result1 = service.getJson('JSON_CONFIG', {});
				expect(result1).toEqual({ cached: true });

				process.env.JSON_CONFIG = '{"new":true}';
				const result2 = service.getJson('JSON_CONFIG', {});
				expect(result2).toEqual({ cached: true }); // 返回缓存值
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
				expect(result.error).toContain('未设置');
			});

			it('无效 JSON 应该返回 Fail', () => {
				process.env.JSON_CONFIG = '{invalid}';
				const result = service.getSafeJson('JSON_CONFIG');
				expect(result.isFail()).toBe(true);
				expect(result.error).toContain('不是有效的 JSON');
			});
		});

		describe('getEnum', () => {
			it('应该返回有效的枚举值', () => {
				process.env.LOG_LEVEL = 'debug';
				const value = service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info');
				expect(value).toBe('debug');
			});

			it('无效值应该返回默认值', () => {
				process.env.LOG_LEVEL = 'trace';
				const value = service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info');
				expect(value).toBe('info');
			});

			it('未设置时应该返回默认值', () => {
				const value = service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info');
				expect(value).toBe('info');
			});

			it('应该缓存枚举解析结果', () => {
				process.env.LOG_LEVEL = 'warn';
				const value1 = service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info');
				expect(value1).toBe('warn');

				process.env.LOG_LEVEL = 'error';
				const value2 = service.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info');
				expect(value2).toBe('warn'); // 返回缓存值
			});
		});

		describe('getNodeEnv', () => {
			it('应该返回当前 Node 环境', () => {
				process.env.NODE_ENV = 'production';
				const value = service.getNodeEnv();
				expect(value).toBe('production');
			});

			it('未设置时应该返回 development', () => {
				const value = service.getNodeEnv();
				expect(value).toBe('development');
			});
		});

		describe('isProduction', () => {
			it('生产环境应该返回 true', () => {
				process.env.NODE_ENV = 'production';
				expect(service.isProduction()).toBe(true);
			});

			it('开发环境应该返回 false', () => {
				process.env.NODE_ENV = 'development';
				expect(service.isProduction()).toBe(false);
			});

			it('测试环境应该返回 false', () => {
				process.env.NODE_ENV = 'test';
				expect(service.isProduction()).toBe(false);
			});
		});

		describe('isDevelopment', () => {
			it('开发环境应该返回 true', () => {
				process.env.NODE_ENV = 'development';
				expect(service.isDevelopment()).toBe(true);
			});

			it('生产环境应该返回 false', () => {
				process.env.NODE_ENV = 'production';
				expect(service.isDevelopment()).toBe(false);
			});
		});

		describe('isTest', () => {
			it('测试环境应该返回 true', () => {
				process.env.NODE_ENV = 'test';
				expect(service.isTest()).toBe(true);
			});

			it('开发环境应该返回 false', () => {
				process.env.NODE_ENV = 'development';
				expect(service.isTest()).toBe(false);
			});
		});

		describe('clearCache', () => {
			it('应该清除所有缓存', () => {
				process.env.TEST_VAR = 'value1';
				const value1 = service.get('TEST_VAR');
				expect(value1).toBe('value1');

				service.clearCache();

				process.env.TEST_VAR = 'value2';
				const value2 = service.get('TEST_VAR');
				expect(value2).toBe('value2');
			});
		});

		describe('clearCacheFor', () => {
			it('应该清除指定 key 的所有类型缓存', () => {
				process.env.PORT = '3000';
				process.env.DEBUG = 'true';

				// 建立缓存
				service.getNumber('PORT', 0);
				service.getBoolean('DEBUG', false);

				// 清除 PORT 的缓存
				service.clearCacheFor('PORT');

				// PORT 应该重新读取
				process.env.PORT = '4000';
				expect(service.getNumber('PORT', 0)).toBe(4000);

				// DEBUG 应该仍然使用缓存
				process.env.DEBUG = 'false';
				expect(service.getBoolean('DEBUG', false)).toBe(true);
			});
		});
	});

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
			const provider = module.providers?.[0] as { provide: typeof ConfigService; useFactory: () => Promise<ConfigService> };
			expect(provider.provide).toBe(ConfigService);

			const service = await provider.useFactory();
			expect(service).toBeInstanceOf(ConfigService);
		});
	});
});
