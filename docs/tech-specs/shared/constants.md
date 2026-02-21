# Constants 模块技术规范

> 版本：0.1.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/constants` 提供跨包共享的基础常量：

- **零依赖**：无任何外部依赖
- **类型安全**：TypeScript 常量定义
- **统一管理**：避免魔法字符串散落

### 1.2 设计原则

- 仅提供"默认值/标识符常量"
- 运行时最终配置应由 `@oksai/config` 负责加载与校验
- 不包含具体业务逻辑

---

## 二、模块结构

```
@oksai/constants/
├── lib/
│   ├── api.ts              # API 相关常量
│   ├── api.spec.ts
│   ├── reflect-metadata.ts # 反射元数据键常量
│   └── reflect-metadata.spec.ts
└── index.ts
```

---

## 三、API 常量

### 3.1 端口常量

```typescript
DEFAULT_PLATFORM_API_PORT = 3000        // 默认平台 API 端口
DEFAULT_PLATFORM_ADMIN_API_PORT = 3001  // 默认管理 API 端口
```

### 3.2 API 路径常量

```typescript
DEFAULT_PLATFORM_API_PREFIX = 'api'     // 默认平台 API 前缀
DEFAULT_PLATFORM_ADMIN_API_PREFIX = 'admin' // 默认管理 API 前缀
DEFAULT_SWAGGER_PATH = '/swagger'       // Swagger 文档路径
DEFAULT_SCALAR_PATH = '/docs'           // Scalar API 文档路径
HEALTH_ENDPOINT_PATH = '/health'        // 健康检查端点路径
```

### 3.3 HTTP 相关常量

```typescript
DEFAULT_HTTP_TIMEOUT_MS = 30000         // 默认请求超时（30秒）
DEFAULT_HTTP_MAX_BODY_SIZE = 10 * 1024 * 1024  // 默认最大请求体（10MB）
```

### 3.4 租户相关常量

```typescript
TENANT_ID_HEADER = 'x-tenant-id'        // 租户 ID Header
TENANT_CONTEXT_KEY = 'tenantContext'    // 租户上下文存储键
```

### 3.5 认证相关常量

```typescript
JWT_PAYLOAD_KEY = 'jwtPayload'          // JWT Payload 存储键
USER_ID_KEY = 'userId'                  // 用户 ID 存储键
DEFAULT_JWT_EXPIRES_IN_MS = 24 * 60 * 60 * 1000  // 默认 JWT 过期时间（24小时）
```

### 3.6 日志相关常量

```typescript
DEFAULT_LOG_LEVEL = 'info'              // 默认日志级别
REQUEST_ID_HEADER = 'x-request-id'      // 请求 ID Header
```

### 3.7 分页常量

```typescript
DEFAULT_PAGE_NUMBER = 1                 // 默认页码
DEFAULT_PAGE_SIZE = 20                  // 默认每页数量
MAX_PAGE_SIZE = 100                     // 最大每页数量
```

---

## 四、反射元数据键常量

### 4.1 认证相关

```typescript
PUBLIC_METHOD_METADATA = '__public:route__'   // 公共路由标识
ROLES_METADATA = '__roles__'                  // 角色标识
PERMISSIONS_METADATA = '__permissions__'      // 权限标识
```

### 4.2 功能相关

```typescript
FEATURE_METADATA = '__feature__'              // 功能开关标识
MODULE_METADATA = '__module__'                // 模块标识
CONTROLLER_METADATA = '__controller__'        // 控制器标识
HANDLER_METADATA = '__handler__'              // 处理器标识
```

### 4.3 租户相关

```typescript
TENANT_ISOLATION_METADATA = '__tenant:isolation__'  // 租户隔离标识
TENANT_OPTIONAL_METADATA = '__tenant:optional__'    // 租户可选标识
```

### 4.4 CQRS 相关

```typescript
COMMAND_HANDLER_METADATA = '__command:handler__'    // 命令处理器标识
QUERY_HANDLER_METADATA = '__query:handler__'        // 查询处理器标识
EVENT_HANDLER_METADATA = '__event:handler__'        // 事件处理器标识
```

### 4.5 缓存相关

```typescript
CACHE_KEY_METADATA = '__cache:key__'          // 缓存键标识
CACHE_TTL_METADATA = '__cache:ttl__'          // 缓存 TTL 标识
```

---

## 五、使用示例

### 5.1 导入常量

```typescript
import {
	DEFAULT_PLATFORM_API_PORT,
	TENANT_ID_HEADER,
	PUBLIC_METHOD_METADATA
} from '@oksai/constants';
```

### 5.2 与 @oksai/config 配合使用

```typescript
import { env } from '@oksai/config';
import { DEFAULT_PLATFORM_API_PORT } from '@oksai/constants';

// 使用常量作为默认值
const port = env.int('PORT', { 
	defaultValue: DEFAULT_PLATFORM_API_PORT,
	min: 1,
	max: 65535
});
```

### 5.3 在装饰器中使用元数据键

```typescript
import { SetMetadata } from '@nestjs/common';
import { PUBLIC_METHOD_METADATA, ROLES_METADATA } from '@oksai/constants';

export const Public = () => SetMetadata(PUBLIC_METHOD_METADATA, true);
export const Roles = (...roles: string[]) => SetMetadata(ROLES_METADATA, roles);
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|:---|:---|
| Test Suites | 2 passed |
| Tests | 33 passed |
| Coverage | 100% |

---

## 七、注意事项

1. **不要在此模块中添加业务逻辑**：仅存放常量
2. **不要直接修改常量值**：常量应保持不可变
3. **配置优先级**：运行时配置 > 默认常量
4. **新增常量时**：确保添加对应的测试用例

---

## 八、修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v0.1.0 | 2026-02-22 | 初始版本 |
