# Logger 模块技术规范

> 版本：2.1.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/logger` 是企业级日志解决方案，基于 `nestjs-pino` 和 `pino` 构建，提供：

- **LoggerService 接口**：实现 NestJS `LoggerService`，可用于 `app.useLogger()`
- **自动上下文注入**：集成 `@oksai/context`，自动注入 `tenantId`、`userId`、`correlationId`
- **统一请求日志**：自动记录 HTTP 请求，包含 requestId
- **增强序列化器**：请求、响应、错误完整序列化
- **智能日志级别**：按 HTTP 状态码自动分级
- **字段脱敏**：通过 redact 配置敏感信息
- **美化输出**：开发环境支持 pino-pretty 格式化
- **子日志器**：支持创建绑定上下文的子日志器
- **transport 支持**：独立创建 Pino 实例时也支持 pino-pretty

### 1.2 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| nestjs-pino | ^4.x | NestJS 集成 |
| pino | ^9.x | 高性能日志库 |
| pino-pretty | ^13.x | 开发环境美化（可选） |
| @oksai/context | workspace | 多租户上下文 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/logger/
├── lib/
│   ├── logger.module.ts           # 模块定义（forRoot/forRootAsync）
│   ├── logger-serializers.ts      # 序列化器（req/res/err）
│   └── oksai-logger.service.ts    # 日志服务（实现 LoggerService）
├── spec/
│   └── internal-functions.spec.ts # 单元测试
└── index.ts
```

### 2.2 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                      NestJS Application                      │
│                                                              │
│  app.useLogger(app.get(OksaiLoggerService))                 │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      LoggerModule                            │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │ OksaiLoggerService  │  │ LoggerModule (nestjs-pino)  │   │
│  │ - LoggerService     │  │ - PinoHttp Middleware       │   │
│  │ - 上下文注入         │  │ - 自动请求日志              │   │
│  │ - 子日志器          │  │ - 智能日志级别              │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Serializers                                         │    │
│  │ - serializeRequest(req) → { method, url, ... }     │    │
│  │ - serializeResponse(res) → { statusCode, ... }     │    │
│  │ - serializeError(err) → { type, message, ... }     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    @oksai/context                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ TenantContextService                                │    │
│  │ - tenantId                                          │    │
│  │ - userId                                            │    │
│  │ - correlationId                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、配置选项

### 3.1 LoggerModuleOptions

```typescript
interface LoggerModuleOptions {
  /** 是否全局模块 */
  isGlobal?: boolean;              // 默认 true

  /** 日志级别 */
  level?: string;                  // 默认 'info'

  /** 服务名称 */
  serviceName?: string;            // 默认 'oksai'

  /** 是否启用控制台美化输出 */
  pretty?: boolean;                // 默认 false

  /** 日志脱敏路径 */
  redact?: string[];

  /** 是否启用上下文注入（tenantId、userId、correlationId） */
  enableContext?: boolean;         // 默认 true

  /** 额外的日志字段注入器 */
  customProps?: (req: unknown, res: unknown) => Record<string, unknown>;

  /** 美化输出选项 */
  prettyOptions?: {
    colorize?: boolean;            // 默认 true
    timeFormat?: string;           // 默认 'SYS:standard'
    singleLine?: boolean;          // 默认 false
    errorLikeObjectKeys?: string[]; // 默认 ['err', 'error']
    ignore?: string;               // 默认 'pid,hostname'
  };
}
```

### 3.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LOG_LEVEL` | 日志级别 | `info` |
| `NODE_ENV` | 运行环境 | `development` |

### 3.3 默认脱敏字段

```typescript
const defaultRedact = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.set-cookie',
  'req.body.password',
  'req.body.token'
];
```

---

## 四、使用方式

### 4.1 基本使用

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@oksai/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'info',
      pretty: false,
    }),
  ],
})
export class AppModule {}
```

### 4.2 异步配置（推荐）

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@oksai/logger';
import { ConfigService } from '@oksai/config';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        level: config.get('LOG_LEVEL') ?? 'info',
        pretty: config.isDevelopment(),
        enableContext: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 4.3 作为 NestJS 全局日志器

**重要**：`OksaiLoggerService` 是 scoped provider（`Scope.TRANSIENT`），必须使用 `resolve()` 而非 `get()`。

```typescript
import { NestFactory } from '@nestjs/core';
import { OksaiLoggerService } from '@oksai/logger';

async function bootstrap() {
  // 使用 bufferLogs 缓冲启动日志，等 Logger 设置完成后统一输出
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  
  // ⚠️ 使用 resolve() 而非 get()，因为 OksaiLoggerService 是 scoped provider
  const logger = await app.resolve(OksaiLoggerService);
  app.useLogger(logger);
  
  await app.listen(3000);
  
  logger.log(`应用已启动: http://localhost:3000`);
}
bootstrap();
```

### 4.4 在服务中注入使用

```typescript
import { Injectable } from '@nestjs/common';
import { OksaiLoggerService } from '@oksai/logger';

@Injectable()
export class UserService {
  constructor(private readonly logger: OksaiLoggerService) {}

  async createUser(data: CreateUserDto) {
    this.logger.log('创建用户', { userId: data.id, email: data.email });
    
    try {
      // 业务逻辑
    } catch (error) {
      this.logger.error('创建用户失败', error as Error);
      throw error;
    }
  }
}
```

### 4.5 创建子日志器

```typescript
import { Injectable } from '@nestjs/common';
import { OksaiLoggerService } from '@oksai/logger';

@Injectable()
export class JobService {
  private readonly logger: OksaiLoggerService;

  constructor(logger: OksaiLoggerService) {
    // 创建绑定 module 字段的子日志器
    this.logger = logger.child({ module: 'JobService' });
  }

  processJob(jobId: string) {
    // 日志自动包含 module: 'JobService'
    this.logger.log('开始处理任务', { jobId });
  }
}
```

### 4.6 生产环境配置

```typescript
LoggerModule.forRoot({
  level: 'info',
  pretty: false,
  enableContext: true,
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers.set-cookie',
    'req.body.password',
    'req.body.creditCard',
    'req.body.token',
  ],
  customProps: (req, res) => ({
    // 额外自定义字段
    version: '1.0.0',
  }),
});
```

### 4.7 开发环境配置

```typescript
LoggerModule.forRoot({
  level: 'debug',
  pretty: true,
  prettyOptions: {
    colorize: true,
    timeFormat: 'HH:MM:ss.l',
    singleLine: true,
  },
});
```

---

## 五、核心功能

### 5.1 上下文注入

自动从 `@oksai/context` 注入租户上下文：

```json
{
  "level": "info",
  "time": 1708531200000,
  "msg": "处理请求",
  "requestId": "req-123",
  "tenantId": "tenant-456",
  "userId": "user-789",
  "correlationId": "corr-abc",
  "service": "oksai"
}
```

### 5.2 requestId 提取优先级

```
1. req.headers['x-request-id']
2. req.headers['x-correlation-id']
3. req.id
4. req.requestId
5. 'unknown'（兜底）
```

### 5.3 日志级别计算

| 响应状态码 | 日志级别 |
|-----------|----------|
| 2xx | `info` |
| 3xx | `info` |
| 4xx | `warn` |
| 5xx | `error` |
| 有错误对象 | `error` |
| UnhandledPromiseRejection | `fatal` |

### 5.4 请求序列化

```typescript
interface SerializedRequest {
  method: string;
  url: string;
  query?: Record<string, unknown>;
  headers?: {
    'content-type': string;
    'user-agent': string;
    'x-forwarded-for': string;
    'x-request-id': string;
  };
  remoteAddress?: string;
}
```

### 5.5 响应序列化

```typescript
interface SerializedResponse {
  statusCode: number;
  contentLength?: number;
}
```

### 5.6 错误序列化

```typescript
interface SerializedError {
  type: string;        // 错误类型（如 Error, TypeError）
  message: string;     // 错误消息
  stack?: string;      // 堆栈（非生产环境）
  code?: string | number;  // 错误代码
  details?: unknown;   // 额外详情
}
```

---

## 六、API 参考

### 6.1 LoggerModule

```typescript
class LoggerModule {
  // 同步配置
  static forRoot(options?: LoggerModuleOptions): DynamicModule;
  
  // 异步配置
  static forRootAsync(options: LoggerModuleAsyncOptions): DynamicModule;
}

interface LoggerModuleAsyncOptions {
  isGlobal?: boolean;
  useFactory: (...args: unknown[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
  inject?: unknown[];
}
```

### 6.2 OksaiLoggerService

```typescript
class OksaiLoggerService implements LoggerService {
  // LoggerService 接口
  log(message: unknown, context?: string | Record<string, unknown>): void;
  error(message: unknown, trace?: string, context?: string): void;
  warn(message: unknown, context?: string | Record<string, unknown>): void;
  debug?(message: unknown, context?: string | Record<string, unknown>): void;
  verbose?(message: unknown, context?: string | Record<string, unknown>): void;

  // 便捷方法
  info(message: unknown, context?: Record<string, unknown>): void;
  fatal(message: unknown, context?: Record<string, unknown>): void;
  trace(message: unknown, context?: Record<string, unknown>): void;

  // 子日志器
  child(bindings: LogContext): OksaiLoggerService;

  // 上下文管理
  setContext(context: string): void;
  getContext(): string | undefined;

  // 获取底层 Pino 实例
  getPino(): Logger;
}

interface LogContext {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  module?: string;
  service?: string;
  [key: string]: unknown;
}
```

### 6.3 序列化器

```typescript
// 序列化请求
function serializeRequest(req: unknown): SerializedRequest;

// 序列化响应
function serializeResponse(res: unknown): SerializedResponse;

// 序列化错误
function serializeError(err: unknown, isProduction?: boolean): SerializedError;

// 计算日志级别
function computeLogLevel(
  req: unknown, 
  res: unknown, 
  err?: unknown
): 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

// 从请求提取 requestId
function getRequestIdFromReq(req: unknown): string;

// 解析可选依赖
function resolveOptionalDependency(name: string): string | null;
```

---

## 七、测试覆盖

| 指标 | 数值 |
|------|------|
| Test Suites | 1 passed |
| Tests | 60 passed |

---

## 八、注意事项

1. **pino-pretty 是可选依赖**：未安装时自动降级为 JSON 输出
2. **性能考虑**：生产环境应关闭 `pretty` 选项
3. **敏感信息**：通过 `redact` 配置脱敏路径
4. **上下文依赖**：`enableContext: true` 需要配合 `@oksai/context` 使用
5. **子日志器**：子日志器继承父日志器的配置和上下文
6. **scoped provider**：`OksaiLoggerService` 是 `Scope.TRANSIENT`，必须使用 `resolve()` 而非 `get()`
7. **bufferLogs**：使用 `bufferLogs: true` 确保启动日志也使用美化格式
8. **不要重复注册**：`OksaiLoggerService` 由 `LoggerModule` 自动提供，不要在其他模块的 `providers` 中重复注册
9. **pnpm 依赖**：使用 pnpm workspace 时，`pino-pretty` 需要在应用侧的 `devDependencies` 中安装

---

## 九、与其他模块集成

### 9.1 与 @oksai/context 集成

```typescript
// LoggerModule 会自动从 TenantContextService 获取上下文
// 无需额外配置，只需确保 enableContext: true（默认）

LoggerModule.forRoot({
  enableContext: true,  // 自动注入 tenantId, userId, correlationId
});
```

### 9.2 与 @oksai/config 集成

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        level: config.get('LOG_LEVEL') ?? 'info',
        pretty: config.isDevelopment(),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 9.3 与 @oksai/app-kit（OksaiPlatformModule）集成

**重要**：`OksaiLoggerService` 由 `LoggerModule` 自动提供，不要在 `OksaiPlatformModule` 或其他模块的 `providers` 中重复注册。

```typescript
// ✅ 正确：通过 OksaiPlatformModule.init() 配置日志
@Module({
  imports: [
    OksaiPlatformModule.init({
      isGlobal: true,
      enableCqrs: true,
      enableEda: true,
      // 开发环境启用美化日志
      prettyLog: process.env.NODE_ENV !== 'production',
      logLevel: 'debug',
    }),
  ],
})
export class AppModule {}

// ❌ 错误：不要重复注册 OksaiLoggerService
@Module({
  imports: [OksaiPlatformModule.init({ ... })],
  providers: [OksaiLoggerService],  // ❌ 会导致依赖注入错误
})
export class AppModule {}
```

**main.ts 中的使用**：

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,  // 缓冲启动日志
  });

  // ⚠️ 使用 resolve() 而非 get()
  const logger = await app.resolve(OksaiLoggerService);
  app.useLogger(logger);

  await app.listen(3000);
  logger.log(`应用已启动: http://localhost:3000`);
}
```

---

## 十、日志示例

### 10.1 开发环境（pretty）

```
[10:30:45.123] INFO: 处理请求
    requestId: "req-123"
    tenantId: "tenant-456"
    userId: "user-789"
    service: "oksai"
    module: "UserService"
```

### 10.2 生产环境（JSON）

```json
{
  "level": 30,
  "time": 1708531200000,
  "pid": 12345,
  "hostname": "app-server-1",
  "name": "oksai",
  "msg": "处理请求",
  "requestId": "req-123",
  "tenantId": "tenant-456",
  "userId": "user-789",
  "correlationId": "corr-abc",
  "service": "oksai",
  "module": "UserService"
}
```

### 10.3 错误日志

```json
{
  "level": 50,
  "time": 1708531200000,
  "msg": "创建用户失败",
  "requestId": "req-123",
  "tenantId": "tenant-456",
  "error": {
    "type": "DomainException",
    "message": "用户名已存在",
    "code": "USER_DUPLICATE"
  },
  "trace": "Error: 用户名已存在\n    at UserService.createUser..."
}
```
