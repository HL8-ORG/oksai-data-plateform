/**
 * @description 反射元数据键常量
 *
 * 用途：在装饰器/守卫/拦截器中以统一 key 写入/读取 metadata，避免魔法字符串散落。
 *
 * @module @oksai/constants
 */

// ============ 认证相关元数据 ============

/**
 * @description 公共路由元数据键（标识无需认证的路由）
 */
export const PUBLIC_METHOD_METADATA = '__public:route__';

/**
 * @description 角色元数据键
 */
export const ROLES_METADATA = '__roles__';

/**
 * @description 权限元数据键
 */
export const PERMISSIONS_METADATA = '__permissions__';

// ============ 功能相关元数据 ============

/**
 * @description 功能开关元数据键
 */
export const FEATURE_METADATA = '__feature__';

/**
 * @description 模块元数据键
 */
export const MODULE_METADATA = '__module__';

/**
 * @description 控制器元数据键
 */
export const CONTROLLER_METADATA = '__controller__';

/**
 * @description 处理器元数据键
 */
export const HANDLER_METADATA = '__handler__';

// ============ 租户相关元数据 ============

/**
 * @description 租户隔离元数据键（标识需要租户隔离的路由）
 */
export const TENANT_ISOLATION_METADATA = '__tenant:isolation__';

/**
 * @description 租户可选元数据键（标识租户上下文可选的路由）
 */
export const TENANT_OPTIONAL_METADATA = '__tenant:optional__';

// ============ CQRS 相关元数据 ============

/**
 * @description 命令处理器元数据键
 */
export const COMMAND_HANDLER_METADATA = '__command:handler__';

/**
 * @description 查询处理器元数据键
 */
export const QUERY_HANDLER_METADATA = '__query:handler__';

/**
 * @description 事件处理器元数据键
 */
export const EVENT_HANDLER_METADATA = '__event:handler__';

// ============ 缓存相关元数据 ============

/**
 * @description 缓存键元数据键
 */
export const CACHE_KEY_METADATA = '__cache:key__';

/**
 * @description 缓存 TTL 元数据键
 */
export const CACHE_TTL_METADATA = '__cache:ttl__';
