# Config 模块技术规范

> 版本：3.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/config` 提供统一的配置管理服务：

- **环境变量访问**：类型安全的配置读取
- **丰富的类型支持**：`string/int/float/bool/enum/url/json/list/durationMs`
- **边界校验**：支持 `min/max` 范围验证
- **安全解析**：`getSafeXxx` 方法返回 Result 类型
- **配置缓存**：避免重复读取环境变量
- **环境检测**：判断当前运行环境（开发/测试/生产）

### 1.2 设计原则

- **简洁优先**：不引入复杂的配置文件解析库
- **类型安全**：提供不同类型的配置读取方法
- **错误友好**：安全方法返回 Result 类型，避免运行时错误
- **环境隔离**：支持多环境配置切换

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/config/
├── lib/
│   ├── config-env.ts        # 环境变量解析器（静态方法）
│   └── config.service.ts    # 配置服务（带缓存）
├── spec/
│   └── config.spec.ts
└── index.ts
```

### 2.2 双层 API 设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Application                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ env（静态方法，无缓存）                              │    │
│  │  .string(name, options)    → string                 │    │
│  │  .int(name, options)       → number                 │    │
│  │  .float(name, options)     → number                 │    │
│  │  .bool(name, options)      → boolean                │    │
│  │  .enum(name, allowed)      → T                      │    │
│  │  .url(name, options)       → string                 │    │
│  │  .json<T>(name, options)   → T                      │    │
│  │  .list(name, options)      → string[]               │    │
│  │  .durationMs(name, opts)   → number                 │    │
│  │  .getSafeXxx(...)          → Result<T, string>      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ConfigService（实例方法，带缓存）                    │    │
│  │  .get(name, options)       → string | undefined     │    │
│  │  .getRequired(name)        → string                 │    │
│  │  .getInt(name, options)    → number                 │    │
│  │  .getFloat(name, options)  → number                 │    │
│  │  .getBool(name, options)   → boolean                │    │
│  │  .getEnum(name, allowed)   → T                      │    │
│  │  .getUrl(name, options)    → string                 │    │
│  │  .getJson(name, options)   → T                      │    │
│  │  .getList(name, options)   → string[]               │    │
│  │  .getDurationMs(name)      → number                 │    │
│  │  .isProduction()           → boolean                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 env 辅助对象（静态方法）

适用于一次性读取配置，无缓存开销：

```typescript
import { env, ConfigEnvError } from '@oksai/config';

// 字符串
const dbUrl = env.string('DATABASE_URL');
const apiUrl = env.string('API_URL', { defaultValue: 'http://localhost:8080' });

// 整数（带边界校验）
const port = env.int('PORT', { defaultValue: 3000, min: 1, max: 65535 });

// 浮点数
const ratio = env.float('RATIO', { defaultValue: 0.5, min: 0, max: 1 });

// 布尔值
const debug = env.bool('DEBUG', { defaultValue: false });

// 枚举
const mode = env.enum('MODE', ['development', 'production'] as const, { defaultValue: 'development' });

// URL（带协议校验）
const dbUrl = env.url('DATABASE_URL', { allowedProtocols: ['postgresql:', 'mysql:'] });

// JSON
const features = env.json<string[]>('FEATURES', { defaultValue: [] });

// 列表
const origins = env.list('ALLOWED_ORIGINS', { separator: ',' });

// 时长（支持单位：ms/s/m/h/d）
const timeout = env.durationMs('TIMEOUT', { defaultValue: 5000, min: 1000 });
```

### 3.2 安全解析（Result 类型）

适用于可选配置场景，不抛出异常：

```typescript
import { env } from '@oksai/config';

const portResult = env.getSafeInt('PORT', { defaultValue: 3000 });

if (portResult.isOk()) {
  console.log(`端口: ${portResult.value}`);
} else {
  console.error(`配置错误: ${portResult.error}`);
}
```

### 3.3 ConfigService（带缓存）

适用于需要多次读取同一配置的场景：

```typescript
import { ConfigService } from '@oksai/config';

const config = new ConfigService();

// 基本读取
const dbUrl = config.get('DATABASE_URL');
const secretKey = config.getRequired('SECRET_KEY');

// 带选项的读取
const port = config.getInt('PORT', { defaultValue: 3000, min: 1, max: 65535 });
const debug = config.getBool('DEBUG', { defaultValue: false });

// 高级类型
const origins = config.getList('ALLOWED_ORIGINS', { defaultValue: ['*'] });
const timeout = config.getDurationMs('TIMEOUT', { defaultValue: 5000 });

// 环境检测
if (config.isProduction()) {
  // 生产环境逻辑
}
```

### 3.4 缓存控制

```typescript
// 禁用缓存
const config = new ConfigService({ enableCache: false });

// 清除所有缓存
config.clearCache();

// 清除特定 key 的缓存
config.clearCacheFor('PORT');
```

### 3.5 NestJS 集成

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@oksai/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
```

### 3.6 异步配置

```typescript
ConfigModule.forRootAsync({
  useFactory: async () => {
    return { enableCache: true };
  },
  isGlobal: true,
});
```

---

## 四、API 参考

### 4.1 env 辅助对象

```typescript
// 选项接口
interface EnvStringOptions { defaultValue?: string; trim?: boolean; }
interface EnvIntOptions { defaultValue?: number; min?: number; max?: number; }
interface EnvFloatOptions { defaultValue?: number; min?: number; max?: number; }
interface EnvBoolOptions { defaultValue?: boolean; }
interface EnvEnumOptions<T> { defaultValue?: T; }
interface EnvUrlOptions { defaultValue?: string; allowedProtocols?: string[]; }
interface EnvJsonOptions<T> { defaultValue?: T; }
interface EnvListOptions { defaultValue?: string[]; separator?: string; trim?: boolean; }
interface EnvDurationMsOptions { defaultValue?: number; min?: number; max?: number; }

const env = {
  string(name: string, options?: EnvStringOptions): string;
  int(name: string, options?: EnvIntOptions): number;
  float(name: string, options?: EnvFloatOptions): number;
  bool(name: string, options?: EnvBoolOptions): boolean;
  enum<T extends string>(name: string, allowed: readonly T[], options?: EnvEnumOptions<T>): T;
  url(name: string, options?: EnvUrlOptions): string;
  json<T>(name: string, options?: EnvJsonOptions<T>): T;
  list(name: string, options?: EnvListOptions): string[];
  durationMs(name: string, options?: EnvDurationMsOptions): number;
  
  // 安全方法（返回 Result）
  getSafeString(name: string, options?: EnvStringOptions): Result<string, string>;
  getSafeInt(name: string, options?: EnvIntOptions): Result<number, string>;
  getSafeFloat(name: string, options?: EnvFloatOptions): Result<number, string>;
  getSafeBool(name: string, options?: EnvBoolOptions): Result<boolean, string>;
  getSafeJson<T>(name: string, options?: EnvJsonOptions<T>): Result<T, string>;
};
```

### 4.2 ConfigService

```typescript
class ConfigService {
  constructor(options?: ConfigOptions);

  // 基本方法
  get(name: string, options?: EnvStringOptions): string | undefined;
  getRequired(name: string): string;

  // 数字方法
  getInt(name: string, options?: EnvIntOptions): number;
  getFloat(name: string, options?: EnvFloatOptions): number;
  getNumber(name: string, defaultValue?: number): number;  // 兼容旧 API
  getSafeNumber(name: string, defaultValue?: number): Result<number, string>;  // @deprecated

  // 布尔方法
  getBool(name: string, options?: EnvBoolOptions): boolean;
  getBoolean(name: string, defaultValue?: boolean): boolean;  // 兼容旧 API

  // 枚举方法
  getEnum<T extends string>(name: string, allowed: T[], options?: EnvEnumOptions<T>): T;

  // URL 方法
  getUrl(name: string, options?: EnvUrlOptions): string;

  // JSON 方法
  getJson<T>(name: string, options?: EnvJsonOptions<T>): T;
  getSafeJson<T>(name: string, options?: EnvJsonOptions<T>): Result<T, string>;

  // 列表方法
  getList(name: string, options?: EnvListOptions): string[];

  // 时长方法
  getDurationMs(name: string, options?: EnvDurationMsOptions): number;

  // 环境检测
  getNodeEnv(): string;
  isProduction(): boolean;
  isDevelopment(): boolean;
  isTest(): boolean;

  // 缓存控制
  clearCache(): void;
  clearCacheFor(name: string): void;
}
```

### 4.3 ConfigModule

```typescript
class ConfigModule {
  static forRoot(options?: ConfigModuleOptions): DynamicModule;
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => Promise<ConfigOptions> | ConfigOptions;
    inject?: unknown[];
    isGlobal?: boolean;
  }): DynamicModule;
}
```

### 4.4 错误类型

```typescript
class ConfigEnvError extends Error {
  name: 'ConfigEnvError';
}
```

---

## 五、时长格式支持

`durationMs` 方法支持的格式：

| 格式 | 示例 | 毫秒值 |
|------|------|--------|
| 纯数字 | `1500` | 1500 |
| 毫秒 | `1500ms` | 1500 |
| 秒 | `2s` | 2000 |
| 分钟 | `5m` | 300000 |
| 小时 | `1h` | 3600000 |
| 天 | `1d` | 86400000 |

---

## 六、布尔值解析规则

| 环境变量值 | 解析结果 |
|-----------|---------|
| `'true'` / `'1'` | `true` |
| `'false'` / `'0'` | `false` |
| 其他值 | 抛出 `ConfigEnvError` |

---

## 七、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Test Suites | 1 passed |
| Tests | 78 passed |

---

## 八、环境变量约定

### 8.1 标准变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | `development`, `test`, `production` |
| `PORT` | 服务端口 | `3000` |
| `LOG_LEVEL` | 日志级别 | `debug`, `info`, `warn`, `error` |

### 8.2 命名规范

- 使用大写字母和下划线
- 按模块分组：`REDIS_URL`, `REDIS_KEY_PREFIX`
- 布尔值使用 `true`/`false` 或 `1`/`0`
- 敏感信息通过 secrets 管理

---

## 九、注意事项

1. **敏感信息**：不要在代码中硬编码敏感配置
2. **默认值**：为可选配置提供合理的默认值
3. **必需配置**：使用 `getRequired()` 或无默认值的 `env.xxx()` 确保关键配置存在
4. **边界校验**：使用 `min/max` 限制数值范围
5. **缓存**：启用缓存后，修改环境变量不会立即生效
6. **错误处理**：解析失败会抛出 `ConfigEnvError`，使用 `getSafeXxx` 避免

---

## 十、与其他模块集成

### 10.1 与 @oksai/redis 集成

```typescript
import { env } from '@oksai/config';

setupRedisModule({
  url: env.string('REDIS_URL'),
  keyPrefix: env.string('REDIS_KEY_PREFIX', { defaultValue: 'oksai:' }),
});
```

### 10.2 与 @oksai/database 集成

```typescript
import { env } from '@oksai/config';

const dbConfig = DatabaseConfig.create({
  host: env.string('DB_HOST', { defaultValue: 'localhost' }),
  port: env.int('DB_PORT', { defaultValue: 5432, min: 1, max: 65535 }),
  database: env.string('DB_NAME'),
  username: env.string('DB_USER'),
  password: env.string('DB_PASSWORD'),
  maxConnections: env.int('DB_POOL_SIZE', { defaultValue: 20, min: 1 }),
});
```
