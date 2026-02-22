/**
 * @description API 常量测试
 */
import {
	DEFAULT_PLATFORM_API_PORT,
	DEFAULT_PLATFORM_ADMIN_API_PORT,
	DEFAULT_PLATFORM_API_PREFIX,
	DEFAULT_PLATFORM_ADMIN_API_PREFIX,
	DEFAULT_SWAGGER_PATH,
	DEFAULT_SCALAR_PATH,
	HEALTH_ENDPOINT_PATH,
	DEFAULT_HTTP_TIMEOUT_MS,
	DEFAULT_HTTP_MAX_BODY_SIZE,
	TENANT_ID_HEADER,
	TENANT_CONTEXT_KEY,
	JWT_PAYLOAD_KEY,
	USER_ID_KEY,
	DEFAULT_JWT_EXPIRES_IN_MS,
	DEFAULT_LOG_LEVEL,
	REQUEST_ID_HEADER,
	DEFAULT_PAGE_NUMBER,
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE
} from '../lib/api.constants';

describe('@oksai/constants/api', () => {
	describe('端口常量', () => {
		it('应该定义默认平台 API 端口', () => {
			expect(DEFAULT_PLATFORM_API_PORT).toBe(3000);
		});

		it('应该定义默认管理 API 端口', () => {
			expect(DEFAULT_PLATFORM_ADMIN_API_PORT).toBe(3001);
		});
	});

	describe('API 路径常量', () => {
		it('应该定义默认 API 前缀', () => {
			expect(DEFAULT_PLATFORM_API_PREFIX).toBe('api');
		});

		it('应该定义默认管理 API 前缀', () => {
			expect(DEFAULT_PLATFORM_ADMIN_API_PREFIX).toBe('admin');
		});

		it('应该定义 Swagger 路径', () => {
			expect(DEFAULT_SWAGGER_PATH).toBe('/swagger');
		});

		it('应该定义 Scalar 路径', () => {
			expect(DEFAULT_SCALAR_PATH).toBe('/docs');
		});

		it('应该定义健康检查路径', () => {
			expect(HEALTH_ENDPOINT_PATH).toBe('/health');
		});
	});

	describe('HTTP 相关常量', () => {
		it('应该定义默认超时', () => {
			expect(DEFAULT_HTTP_TIMEOUT_MS).toBe(30000);
		});

		it('应该定义默认最大请求体大小', () => {
			expect(DEFAULT_HTTP_MAX_BODY_SIZE).toBe(10 * 1024 * 1024);
		});
	});

	describe('租户相关常量', () => {
		it('应该定义租户 ID Header', () => {
			expect(TENANT_ID_HEADER).toBe('x-tenant-id');
		});

		it('应该定义租户上下文键', () => {
			expect(TENANT_CONTEXT_KEY).toBe('tenantContext');
		});
	});

	describe('认证相关常量', () => {
		it('应该定义 JWT Payload 键', () => {
			expect(JWT_PAYLOAD_KEY).toBe('jwtPayload');
		});

		it('应该定义用户 ID 键', () => {
			expect(USER_ID_KEY).toBe('userId');
		});

		it('应该定义默认 JWT 过期时间', () => {
			expect(DEFAULT_JWT_EXPIRES_IN_MS).toBe(24 * 60 * 60 * 1000);
		});
	});

	describe('日志相关常量', () => {
		it('应该定义默认日志级别', () => {
			expect(DEFAULT_LOG_LEVEL).toBe('info');
		});

		it('应该定义请求 ID Header', () => {
			expect(REQUEST_ID_HEADER).toBe('x-request-id');
		});
	});

	describe('分页常量', () => {
		it('应该定义默认页码', () => {
			expect(DEFAULT_PAGE_NUMBER).toBe(1);
		});

		it('应该定义默认每页数量', () => {
			expect(DEFAULT_PAGE_SIZE).toBe(20);
		});

		it('应该定义最大每页数量', () => {
			expect(MAX_PAGE_SIZE).toBe(100);
		});
	});
});
