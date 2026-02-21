# Redis 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/redis` 提供统一的 Redis 客户端封装，支持：

- **动态模块配置**：通过 `setupRedisModule` 灵活配置
- **健康检查**：集成 NestJS Terminus 健康检查
- **Key 前缀**：支持多租户/多环境隔离
- **优雅关闭**：模块销毁时自动断开连接

### 1.2 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| ioredis | ^5.x | Redis 客户端 |
| @nestjs/terminus | ^11.x | 健康检查集成 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/redis/
├── lib/
│   ├── modules/
│   │   └── redis.module.ts          # 动态模块配置
│   ├── health/
│   │   └── redis-health.service.ts  # 健康检查服务
│   ├── repository/
│   │   └── abstract-redis.repository.ts  # 仓储基类
│   ├── config/
│   │   └── redis.config.ts          # 配置读取
│   └── tokens.ts                    # DI Token
├── spec/
│   ├── modules/
│   ├── health/
│   ├── abstract-redis.repository.spec.ts
│   └── ...
└── index.ts
```

### 2.2 依赖注入

```
┌─────────────────────────────────────────────────────────────┐
│                    OksaiRedisRuntimeModule                   │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ OKSAI_REDIS     │  │ OksaiRedisHealthService         │  │
│  │ (ioredis client)│  │ (HealthIndicator)               │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
│           │                         │                       │
│           ▼                         ▼                       │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ AbstractRedis   │  │ Health Check Endpoint           │  │
│  │ Repository      │  │ (/health)                       │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、配置选项

### 3.1 SetupRedisModuleOptions

```typescript
interface SetupRedisModuleOptions {
  /** Redis URL（若不传则从 ConfigService 读取 redis.url） */
  url?: string;

  /** key 前缀（若不传则从 ConfigService 读取 redis.keyPrefix） */
  keyPrefix?: string;

  /** 是否启用 lazyConnect（默认 false） */
  lazyConnect?: boolean;
}
```

### 3.2 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `REDIS_URL` | Redis 连接 URL | `redis://localhost:6379` |
| `REDIS_KEY_PREFIX` | Key 前缀 | `oksai:` |

### 3.3 DI Token

```typescript
export const OKSAI_REDIS = Symbol.for('OKSAI_REDIS');
```

---

## 四、使用方式

### 4.1 基本使用

```typescript
import { Module } from '@nestjs/common';
import { setupRedisModule } from '@oksai/redis';

@Module({
  imports: [
    setupRedisModule({
      url: process.env.REDIS_URL,
      keyPrefix: 'oksai:',
    }),
  ],
})
export class AppModule {}
```

### 4.2 从 ConfigService 读取配置

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    setupRedisModule(), // 从 ConfigService 读取 redis.url 和 redis.keyPrefix
  ],
})
export class AppModule {}
```

### 4.3 注入 Redis 客户端

```typescript
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { OKSAI_REDIS } from '@oksai/redis';

@Injectable()
export class CacheService {
  constructor(
    @Inject(OKSAI_REDIS) private readonly redis: Redis
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }
}
```

### 4.4 使用健康检查

```typescript
import { Controller } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { OksaiRedisHealthService } from '@oksai/redis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisHealth: OksaiRedisHealthService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.redisHealth.ping('redis'),
    ]);
  }
}
```

### 4.5 使用仓储基类

```typescript
import { AbstractRedisRepository } from '@oksai/redis';
import Redis from 'ioredis';

interface UserSession {
  userId: string;
  token: string;
  expiresAt: number;
}

class SessionRepository extends AbstractRedisRepository<UserSession> {
  constructor(redis: Redis) {
    super(redis, 'session');
  }

  async findByUserId(userId: string): Promise<UserSession | null> {
    const key = this.getKeyById(userId);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async save(session: UserSession): Promise<void> {
    const key = this.getKeyById(session.userId);
    await this.redis.set(key, JSON.stringify(session));
  }
}
```

---

## 五、核心功能

### 5.1 Key 生成规则

```typescript
// AbstractRedisRepository

// 基础 key
getKey(parts: string[]): string {
  return parts.join(':');
}

// 带 ID 的 key
getKeyById(id: string): string {
  return `${this.namespace}:${id}`;
}
```

示例：
```typescript
const repo = new SessionRepository(redis, 'session');
repo.getKeyById('user-123');  // 'session:user-123'
repo.getKey(['session', 'active', 'user-123']);  // 'session:active:user-123'
```

### 5.2 健康检查

```typescript
// OksaiRedisHealthService.ping()

// 成功返回
{
  redis: {
    status: 'up',
    latency: 5  // ms
  }
}

// 失败返回
{
  redis: {
    status: 'down',
    message: '连接失败'
  }
}
```

### 5.3 模块生命周期

```
应用启动
    │
    ▼
setupRedisModule() 创建 Redis 客户端
    │
    ▼
模块正常运行
    │
    ▼
应用关闭 → onModuleDestroy()
    │
    ├─→ redis.quit() 成功
    │
    └─→ redis.quit() 失败 → redis.disconnect()
```

---

## 六、API 参考

### 6.1 setupRedisModule

```typescript
function setupRedisModule(options?: SetupRedisModuleOptions): DynamicModule;
```

创建 NestJS 动态模块，提供 Redis 客户端和健康检查服务。

**返回值**：
- `module`: `OksaiRedisRuntimeModule`
- `providers`: Redis 客户端 Provider, `OksaiRedisHealthService`
- `exports`: `OKSAI_REDIS`, `OksaiRedisHealthService`

### 6.2 OksaiRedisHealthService

```typescript
class OksaiRedisHealthService {
  /**
   * 执行 PING 健康检查
   * @param key - 健康检查标识
   * @returns HealthIndicatorResult
   */
  ping(key: string): Promise<HealthIndicatorResult>;
}
```

### 6.3 AbstractRedisRepository

```typescript
abstract class AbstractRedisRepository<T> {
  protected readonly redis: Redis;
  protected readonly namespace: string;

  constructor(redis: Redis, namespace: string);

  /**
   * 生成 key
   */
  getKey(parts: string[]): string;

  /**
   * 根据 ID 生成 key
   */
  getKeyById(id: string): string;
}
```

### 6.4 getRedisConfig

```typescript
function getRedisConfig(): {
  url: string;       // 从 REDIS_URL 读取
  keyPrefix?: string; // 从 REDIS_KEY_PREFIX 读取
};
```

---

## 七、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 95.91% |
| Branches | 91.66% |
| Functions | 86.66% |
| Lines | 95.55% |

---

## 八、注意事项

1. **连接失败**：`setupRedisModule` 在 `ConfigService` 未配置 `redis.url` 时抛出错误
2. **Key 前缀**：使用 `keyPrefix` 避免多环境/多租户 key 冲突
3. **优雅关闭**：模块销毁时自动调用 `quit()`，失败则调用 `disconnect()`
4. **lazyConnect**：启用后需手动调用 `redis.connect()` 或在首次命令时触发

---

## 九、与其他模块集成

### 9.1 与 @oksai/context 集成（多租户 Key 隔离）

```typescript
@Injectable()
export class TenantCacheService {
  constructor(
    @Inject(OKSAI_REDIS) private readonly redis: Redis,
    private readonly tenantContext: TenantContextService
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const tenantKey = `tenant:${this.tenantContext.tenantId}:${key}`;
    const value = await this.redis.get(tenantKey);
    return value ? JSON.parse(value) : null;
  }
}
```

### 9.2 与 @oksai/config 集成

```typescript
// 在应用配置中
export default () => ({
  redis: {
    url: process.env.REDIS_URL,
    keyPrefix: process.env.REDIS_KEY_PREFIX,
  },
});
```
