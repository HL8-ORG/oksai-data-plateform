/**
 * @description API 相关默认常量
 *
 * 注意：这些常量用于"默认值"，最终运行时配置应来自 `@oksai/config` 的配置工厂。
 *
 * @module @oksai/constants
 */

// ============ 端口常量 ============

/**
 * @description 默认平台 API 端口
 */
export const DEFAULT_PLATFORM_API_PORT = 3000;

/**
 * @description 默认平台管理 API 端口
 */
export const DEFAULT_PLATFORM_ADMIN_API_PORT = 3001;

// ============ API 路径常量 ============

/**
 * @description 默认平台 API 全局前缀
 */
export const DEFAULT_PLATFORM_API_PREFIX = 'api';

/**
 * @description 默认平台管理 API 全局前缀
 */
export const DEFAULT_PLATFORM_ADMIN_API_PREFIX = 'admin';

/**
 * @description Swagger 文档路径
 */
export const DEFAULT_SWAGGER_PATH = '/swagger';

/**
 * @description Scalar API 文档路径
 */
export const DEFAULT_SCALAR_PATH = '/docs';

/**
 * @description 健康检查端点路径
 */
export const HEALTH_ENDPOINT_PATH = '/health';

// ============ HTTP 相关常量 ============

/**
 * @description 默认 HTTP 请求超时（毫秒）
 */
export const DEFAULT_HTTP_TIMEOUT_MS = 30000;

/**
 * @description 默认 HTTP 最大请求体大小（字节）
 */
export const DEFAULT_HTTP_MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

// ============ 租户相关常量 ============

/**
 * @description 默认租户 ID Header 名称
 */
export const TENANT_ID_HEADER = 'x-tenant-id';

/**
 * @description 租户上下文存储键
 */
export const TENANT_CONTEXT_KEY = 'tenantContext';

// ============ 认证相关常量 ============

/**
 * @description JWT Payload 存储键
 */
export const JWT_PAYLOAD_KEY = 'jwtPayload';

/**
 * @description 用户 ID 存储键
 */
export const USER_ID_KEY = 'userId';

/**
 * @description 默认 JWT 过期时间（毫秒）
 */
export const DEFAULT_JWT_EXPIRES_IN_MS = 24 * 60 * 60 * 1000; // 24 小时

// ============ 日志相关常量 ============

/**
 * @description 默认日志级别
 */
export const DEFAULT_LOG_LEVEL = 'info';

/**
 * @description 请求 ID Header 名称
 */
export const REQUEST_ID_HEADER = 'x-request-id';

// ============ 分页常量 ============

/**
 * @description 默认页码
 */
export const DEFAULT_PAGE_NUMBER = 1;

/**
 * @description 默认每页数量
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * @description 最大每页数量
 */
export const MAX_PAGE_SIZE = 100;
