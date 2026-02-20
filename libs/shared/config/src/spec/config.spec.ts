/**
 * Config 模块单元测试
 *
 * 测试配置管理功能
 */
import { ConfigService, ConfigModule } from '../index';

describe('Config', () => {
	describe('ConfigService', () => {
		beforeEach(() => {
			// 重置环境变量
			delete process.env.NODE_ENV;
			delete process.env.DATABASE_URL;
			delete process.env.PORT;
			delete process.env.DEBUG;
			delete process.env.TEST_VAR;
			delete process.env.REQUIRED_VAR;
		});

		describe('get', () => {
			it('应该获取环境变量值', () => {
				// Arrange
				process.env.TEST_VAR = 'test_value';
				const service = new ConfigService();

				// Act
				const value = service.get('TEST_VAR');

				// Assert
				expect(value).toBe('test_value');
			});

			it('环境变量不存在时应该返回默认值', () => {
				// Arrange
				const service = new ConfigService();

				// Act
				const value = service.get('NON_EXISTENT', 'default');

				// Assert
				expect(value).toBe('default');
			});

			it('环境变量不存在且无默认值时应该返回 undefined', () => {
				// Arrange
				const service = new ConfigService();

				// Act
				const value = service.get('NON_EXISTENT');

				// Assert
				expect(value).toBeUndefined();
			});
		});

		describe('getRequired', () => {
			it('应该获取必需的环境变量', () => {
				// Arrange
				process.env.REQUIRED_VAR = 'required_value';
				const service = new ConfigService();

				// Act
				const value = service.getRequired('REQUIRED_VAR');

				// Assert
				expect(value).toBe('required_value');
			});

			it('必需变量不存在时应该抛出异常', () => {
				// Arrange
				const service = new ConfigService();

				// Act & Assert
				expect(() => service.getRequired('NON_EXISTENT')).toThrow();
			});
		});

		describe('getNumber', () => {
			it('应该获取数字类型的环境变量', () => {
				// Arrange
				process.env.PORT = '3000';
				const service = new ConfigService();

				// Act
				const value = service.getNumber('PORT');

				// Assert
				expect(value).toBe(3000);
			});

			it('应该支持默认值', () => {
				// Arrange
				const service = new ConfigService();

				// Act
				const value = service.getNumber('PORT', 8080);

				// Assert
				expect(value).toBe(8080);
			});

			it('非数字值应该返回 NaN', () => {
				// Arrange
				process.env.PORT = 'not-a-number';
				const service = new ConfigService();

				// Act
				const value = service.getNumber('PORT');

				// Assert
				expect(Number.isNaN(value)).toBe(true);
			});

			it('无默认值且无环境变量时应该返回 NaN', () => {
				// Arrange
				const service = new ConfigService();

				// Act
				const value = service.getNumber('NON_EXISTENT');

				// Assert
				expect(Number.isNaN(value)).toBe(true);
			});
		});

		describe('getBoolean', () => {
			it('应该识别 true 值', () => {
				// Arrange
				process.env.DEBUG = 'true';
				const service = new ConfigService();

				// Act
				const value = service.getBoolean('DEBUG');

				// Assert
				expect(value).toBe(true);
			});

			it('应该识别 false 值', () => {
				// Arrange
				process.env.DEBUG = 'false';
				const service = new ConfigService();

				// Act
				const value = service.getBoolean('DEBUG');

				// Assert
				expect(value).toBe(false);
			});

			it('应该支持默认值', () => {
				// Arrange
				const service = new ConfigService();

				// Act
				const value = service.getBoolean('DEBUG', true);

				// Assert
				expect(value).toBe(true);
			});

			it('无默认值时应该返回 false', () => {
				// Arrange
				const service = new ConfigService();

				// Act
				const value = service.getBoolean('DEBUG');

				// Assert
				expect(value).toBe(false);
			});
		});

		describe('getNodeEnv', () => {
			it('应该返回当前 Node 环境', () => {
				// Arrange
				process.env.NODE_ENV = 'production';
				const service = new ConfigService();

				// Act
				const value = service.getNodeEnv();

				// Assert
				expect(value).toBe('production');
			});

			it('未设置时应该返回 development', () => {
				// Arrange
				const service = new ConfigService();

				// Act
				const value = service.getNodeEnv();

				// Assert
				expect(value).toBe('development');
			});
		});

		describe('isProduction', () => {
			it('生产环境应该返回 true', () => {
				// Arrange
				process.env.NODE_ENV = 'production';
				const service = new ConfigService();

				// Act & Assert
				expect(service.isProduction()).toBe(true);
			});

			it('开发环境应该返回 false', () => {
				// Arrange
				process.env.NODE_ENV = 'development';
				const service = new ConfigService();

				// Act & Assert
				expect(service.isProduction()).toBe(false);
			});
		});

		describe('isDevelopment', () => {
			it('开发环境应该返回 true', () => {
				// Arrange
				process.env.NODE_ENV = 'development';
				const service = new ConfigService();

				// Act & Assert
				expect(service.isDevelopment()).toBe(true);
			});

			it('生产环境应该返回 false', () => {
				// Arrange
				process.env.NODE_ENV = 'production';
				const service = new ConfigService();

				// Act & Assert
				expect(service.isDevelopment()).toBe(false);
			});
		});

		describe('isTest', () => {
			it('测试环境应该返回 true', () => {
				// Arrange
				process.env.NODE_ENV = 'test';
				const service = new ConfigService();

				// Act & Assert
				expect(service.isTest()).toBe(true);
			});
		});
	});

	describe('ConfigModule', () => {
		it('应该提供 ConfigService', () => {
			// Act
			const module = ConfigModule.forRoot();

			// Assert
			expect(module).toBeDefined();
			expect(module.exports).toBeDefined();
		});
	});
});
