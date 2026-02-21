# Logger 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/logger` 是企业级日志解决方案，基于 `nestjs-pino` 和 `pino` 构建，提供：

- **统一请求日志**：自动记录 HTTP 请求，包含 requestId
- **字段脱敏**：通过 redact 配置敏感信息
- **美化输出**：开发环境支持 pino-pretty 格式化
- **多租户支持**：可注入租户上下文到日志

### 1.2 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| nestjs-pino | ^4.x | NestJS 集成 |
| pino | ^9.x | 高性能日志库 |
| pino-pretty | ^11.x | 开发环境美化（可选） |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/logger/
├── lib/
│   ├── setup-logger-module.ts       # 主模块配置
│   └── request-id/
│       └── setup-request-id-response-header.ts  # requestId 回传
├── spec/
│   ├── setup-logger-module.spec.ts
│   ├── internal-functions.spec.ts
│   └── setup-request-id-response-header.spec.ts
└── index.ts
```

### 2.2 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                      NestJS Application                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   setupLoggerModule()                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LoggerModule│  │ PinoHttp    │  │ Custom Serializers  │  │
│  │ (nestjs-pino)│  │ Middleware │  │ (req/res)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    pino-pretty (可选)                        │
│                  开发环境美化输出                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、配置选项

### 3.1 SetupLoggerModuleOptions

```typescript
interface SetupLoggerModuleOptions {
  /** 日志级别（优先级：options.level > LOG_LEVEL > info） */
  level?: string;

  /** 是否启用控制台美化输出 */
  pretty?: boolean;

  /** 日志脱敏路径（pino redact 语法） */
  redact?: string[];

  /** 额外的日志字段注入器 */
  customProps?: (req: unknown, res: unknown) => Record<string, unknown>;

  /** 美化输出选项 */
  prettyOptions?: {
    colorize?: boolean;           // 是否启用 ANSI 颜色（默认 true）
    timeFormat?: string;          // 时间格式（默认 SYS:standard）
    singleLine?: boolean;         // 单行输出（默认 false）
    errorLikeObjectKeys?: string[]; // 错误对象字段 key
    ignore?: string;              // 忽略字段（默认 'pid,hostname'）
  };
}
```

### 3.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LOG_LEVEL` | 日志级别 | `info` |

### 3.3 默认脱敏字段

```typescript
const defaultRedact = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.set-cookie'
];
```

---

## 四、使用方式

### 4.1 基本使用

```typescript
import { Module } from '@nestjs/common';
import { setupLoggerModule } from '@oksai/logger';

@Module({
  imports: [
    setupLoggerModule({
      level: process.env.LOG_LEVEL ?? 'info',
      pretty: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class AppModule {}
```

### 4.2 生产环境配置

```typescript
setupLoggerModule({
  level: 'info',
  pretty: false,
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers.set-cookie',
    'req.body.password',
    'req.body.creditCard',
  ],
  customProps: (req, res) => ({
    tenantId: (req as any).tenantId,
    userId: (req as any).userId,
  }),
});
```

### 4.3 开发环境配置

```typescript
setupLoggerModule({
  level: 'debug',
  pretty: true,
  prettyOptions: {
    colorize: true,
    timeFormat: 'HH:MM:ss.l',
    singleLine: true,
  },
});
```

### 4.4 requestId 回传

```typescript
import { NestFactory } from '@nestjs/core';
import { setupRequestIdResponseHeader } from '@oksai/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 在响应头中回传 requestId
  setupRequestIdResponseHeader(app, {
    headerName: 'x-request-id', // 默认值
  });
  
  await app.listen(3000);
}
bootstrap();
```

---

## 五、核心功能

### 5.1 requestId 提取优先级

```
1. req.headers['x-request-id']
2. req.headers['x-correlation-id']
3. req.id
4. req.requestId
5. 'unknown'（兜底）
```

### 5.2 日志级别计算

| 响应状态码 | 日志级别 |
|-----------|----------|
| 2xx | `info` |
| 3xx | `info` |
| 4xx | `warn` |
| 5xx | `error` |
| 有错误对象 | `error` |

### 5.3 请求序列化

只记录必要字段，避免敏感信息泄露：

```typescript
{
  method: 'GET',
  url: '/api/users'
}
```

---

## 六、API 参考

### 6.1 setupLoggerModule

```typescript
function setupLoggerModule(options?: SetupLoggerModuleOptions): DynamicModule;
```

创建 NestJS 动态模块，配置 pino 日志。

### 6.2 setupRequestIdResponseHeader

```typescript
function setupRequestIdResponseHeader(
  app: INestApplication,
  options?: { headerName?: string }
): void;
```

在 HTTP 响应中回传 requestId（仅支持 Fastify adapter）。

### 6.3 内部函数（导出用于测试）

```typescript
// 序列化请求对象
export function serializeRequest(req: unknown): { method: unknown; url: unknown };

// 计算日志级别
export function computeLogLevel(_req: unknown, res: unknown, err?: unknown): 'error' | 'warn' | 'info';

// 从请求对象提取 requestId
export function getRequestIdFromReq(req: unknown): string;

// 解析可选依赖（如 pino-pretty）
export function resolveOptionalDependency(name: string): string | null;
```

---

## 七、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 97.43% |
| Branches | 95.45% |
| Functions | 87.5% |
| Lines | 97.22% |

---

## 八、注意事项

1. **pino-pretty 是可选依赖**：未安装时自动降级为 JSON 输出
2. **Fastify only**：`setupRequestIdResponseHeader` 仅支持 Fastify adapter
3. **性能考虑**：生产环境应关闭 `pretty` 选项
4. **敏感信息**：通过 `redact` 配置脱敏路径

---

## 九、与其他模块集成

### 9.1 与 @oksai/context 集成

```typescript
setupLoggerModule({
  customProps: (req, res) => ({
    tenantId: (req as any).tenantContext?.tenantId,
  }),
});
```

### 9.2 与 @oksai/config 集成

```typescript
// 在应用启动时从 ConfigService 读取配置
const config = app.get(ConfigService);
setupLoggerModule({
  level: config.get('LOG_LEVEL'),
});
```
