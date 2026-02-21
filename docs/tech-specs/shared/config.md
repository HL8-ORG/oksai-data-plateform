# Config 模块技术规范

> 版本：4.1.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/config` 基于 `@nestjs/config` 增强的配置管理模块：

- **环境变量访问**：类型安全的配置读取
- **丰富的类型支持**：`string/int/float/bool/enum/url/json/list/durationMs`
- **zod schema 验证**：配置结构验证与类型推导
- **命名空间配置**：按功能分组管理配置
- **边界校验**：支持 `min/max` 范围验证
- **安全解析**：`getSafeXxx` 方法返回 Result 类型
- **配置缓存**：避免重复读取环境变量
- **环境检测**：判断当前运行环境（开发/测试/生产）
- **中文错误消息**：便于快速定位配置问题
- **双模式初始化**：`forRoot()`（异步）和 `forRootSync()`（同步）

### 1.2 设计原则

- **增强而非替换**：基于 `@nestjs/config` 扩展功能
- **类型安全**：提供不同类型的配置读取方法
- **验证优先**：通过 zod schema 确保配置正确性
- **错误友好**：安全方法返回 Result 类型，中文错误消息
- **灵活初始化**：支持异步和同步两种模块初始化方式

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/config/
├── lib/
│   ├── config-env.ts        # 环境变量解析器（静态方法）
│   ├── config-schema.ts     # zod schema 辅助工具
│   └── config.service.ts    # 配置服务（带缓存 + NestJS 集成）
├── spec/
│   └── config.spec.ts
└── index.ts
```

### 2.2 三层 API 设计

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
│  │  .get(name, options)       → T | undefined          │    │
│  │  .getRequired(name)        → string                 │    │
│  │  .getInt/Float/Bool(...)   → number/boolean        │    │
│  │  .getEnum/Url/Json/List(...)  → T                  │    │
│  │  .getDurationMs(name)      → number                 │    │
│  │  .validate(schema)         → z.infer<T>             │    │
│  │  .registerNamespace(...)   → T                      │    │
│  │  .isProduction()           → boolean                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ envSchema（zod schema 辅助）                         │    │
│  │  .string()                 → ZodOptional            │    │
│  │  .requiredString()         → ZodString              │    │
│  │  .int({ min, max })        → ZodNumber              │    │
│  │  .float({ min, max })      → ZodNumber              │    │
│  │  .bool()                   → ZodBoolean             │    │
│  │  .enum(['a', 'b'])         → ZodEnum                │    │
│  │  .url()                    → ZodString              │    │
│  │  .port()                   → ZodNumber              │    │
│  │  .durationMs()             → ZodNumber              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 NestJS 集成（推荐）

#### 基本使用

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@oksai/config';

@Module({
  imports: [await ConfigModule.forRoot()],
})
export class AppModule {}
```

#### 带 zod schema 验证

```typescript
import { ConfigModule, z } from '@oksai/config';

const appSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
});

@Module({
  imports: [
    await ConfigModule.forRoot({
      schema: appSchema,
      configOptions: { enableCache: true },
    }),
  ],
})
export class AppModule {}
```

#### 命名空间配置

```typescript
import { ConfigModule, z } from '@oksai/config';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const databaseSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  username: z.string(),
  password: z.string(),
  database: z.string(),
});

@Module({
  imports: [
    await ConfigModule.forRoot({
      namespaces: [
        {
          name: 'database',
          factory: (config) => ({
            host: config.getRequired('DB_HOST'),
            port: config.getInt('DB_PORT', { defaultValue: 5432 }),
            username: config.getRequired('DB_USER'),
            password: config.getRequired('DB_PASSWORD'),
            database: config.getRequired('DB_NAME'),
          }),
          schema: databaseSchema,
        },
      ],
    }),
  ],
})
export class AppModule {}
```

#### 同步版本（forRootSync）

适用于不需要 .env 文件，或需要在 DynamicModule 的 `imports` 数组中直接使用的场景：

```typescript
@Module({
  imports: [ConfigModule.forRootSync()],
})
export class AppModule {}
```

#### ⚠️ forRoot() vs forRootSync() 选择指南

| 场景 | 推荐方法 | 原因 |
|------|---------|------|
| **顶层 AppModule** | `await ConfigModule.forRoot()` | 支持 .env 文件加载 |
| **DynamicModule 内部** | `ConfigModule.forRootSync()` | imports 数组不支持 Promise |
| **OksaiPlatformModule** | `ConfigModule.forRootSync()` | 动态模块必须同步返回 |
| **简单场景（无 .env）** | `ConfigModule.forRootSync()` | 避免异步复杂性 |

**重要**：`forRoot()` 返回 `Promise<DynamicModule>`，不能直接用于 `imports` 数组：

```typescript
// ❌ 错误：imports 不支持 Promise
imports: [ConfigModule.forRoot()]

// ✅ 正确方式 1：在顶层模块使用 await
@Module({
  imports: [await ConfigModule.forRoot()],
})
export class AppModule {}

// ✅ 正确方式 2：在 DynamicModule 中使用 forRootSync
static init(): DynamicModule {
  return {
    module: OksaiPlatformModule,
    imports: [ConfigModule.forRootSync()],  // 必须同步
  };
}
```

### 3.2 env 辅助对象（静态方法）

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

### 3.3 安全解析（Result 类型）

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

### 3.4 ConfigService（带缓存）

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

// Schema 验证
const validatedConfig = config.validate(appSchema);

// 命名空间配置
const dbConfig = config.getNamespace<DatabaseConfig>('database');
```

### 3.5 envSchema 辅助

用于快速创建 zod schema：

```typescript
import { envSchema, z } from '@oksai/config';

const configSchema = z.object({
  PORT: envSchema.port().default(3000),
  NODE_ENV: envSchema.enum(['development', 'production', 'test'] as const),
  DATABASE_URL: envSchema.url(),
  DEBUG: envSchema.bool().default(false),
  TIMEOUT: envSchema.durationMs().default(5000),
  RATIO: envSchema.float({ min: 0, max: 1 }).default(0.5),
});
```

### 3.6 缓存控制

```typescript
// 禁用缓存
const config = new ConfigService({ enableCache: false });

// 清除所有缓存
config.clearCache();

// 清除特定 key 的缓存
config.clearCacheFor('PORT');

// 清除命名空间缓存
config.clearNamespaceCache('database');
```

### 3.7 forFeature 模块

用于子模块中注册特定配置：

```typescript
import { ConfigModule } from '@oksai/config';

@Module({
  imports: [
    ConfigModule.forFeature({
      name: 'redis',
      factory: (config) => ({
        url: config.getRequired('REDIS_URL'),
        keyPrefix: config.get('REDIS_KEY_PREFIX', { defaultValue: 'oksai:' }),
      }),
    }),
  ],
})
export class RedisModule {}
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
class ConfigService implements OnModuleDestroy {
  constructor(options?: ConfigOptions);

  // 基本方法
  get<T = string>(key: string): T | undefined;
  get<T = string>(key: string, options?: EnvStringOptions): T | undefined;
  getOrThrow<T = string>(key: string): T;
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
  getEnum<T extends string>(name: string, allowed: readonly T[], options?: EnvEnumOptions<T>): T;

  // URL 方法
  getUrl(name: string, options?: EnvUrlOptions): string;

  // JSON 方法
  getJson<T>(name: string, options?: EnvJsonOptions<T>): T;
  getSafeJson<T>(name: string, options?: EnvJsonOptions<T>): Result<T, string>;

  // 列表方法
  getList(name: string, options?: EnvListOptions): string[];

  // 时长方法
  getDurationMs(name: string, options?: EnvDurationMsOptions): number;

  // Schema 验证
  validate<T extends z.ZodTypeAny>(schema: T): z.infer<T>;
  safeValidate<T extends z.ZodTypeAny>(schema: T): Result<z.infer<T>, string>;

  // 命名空间
  registerNamespace<T extends NamespaceConfig>(namespace: string, factory: () => T): T;
  getNamespace<T extends NamespaceConfig>(namespace: string): T | undefined;
  getOrCreateNamespace<T extends NamespaceConfig>(namespace: string, factory: () => T): T;

  // 环境检测
  getNodeEnv(): string;
  isProduction(): boolean;
  isDevelopment(): boolean;
  isTest(): boolean;

  // 缓存控制
  clearCache(): void;
  clearCacheFor(name: string): void;
  clearNamespaceCache(namespace?: string): void;
}
```

### 4.3 ConfigModule

```typescript
interface ConfigModuleOptions {
  isGlobal?: boolean;                    // 是否全局模块，默认 true
  configOptions?: ConfigOptions;         // 配置服务选项
  ignoreEnvFile?: boolean;               // 是否忽略 .env 文件
  envFilePath?: string | string[];       // .env 文件路径
  namespaces?: NamespaceDefinition[];    // 命名空间配置
  schema?: z.ZodTypeAny;                 // zod schema
  load?: Array<() => Record<string, unknown>>;  // 配置加载函数
}

interface NamespaceDefinition<T extends NamespaceConfig = NamespaceConfig> {
  name: string;                          // 命名空间名称
  factory: (config: ConfigService) => T; // 配置工厂
  schema?: z.ZodType<T>;                 // zod schema（可选）
}

class ConfigModule {
  // 异步加载（支持 .env 文件）
  static forRoot(options?: ConfigModuleOptions): Promise<DynamicModule>;
  
  // 同步版本（纯环境变量）
  static forRootSync(options?: ConfigModuleOptions): DynamicModule;
  
  // 子模块特性配置
  static forFeature(definition: NamespaceDefinition): DynamicModule;
}
```

### 4.4 envSchema 辅助

```typescript
const envSchema = {
  string: () => ZodOptional<ZodString>;
  requiredString: () => ZodString;
  int: (options?: { min?: number; max?: number }) => ZodNumber;
  float: (options?: { min?: number; max?: number }) => ZodNumber;
  bool: () => ZodBoolean;
  enum: <T extends readonly [string, ...string[]]>(values: T) => ZodEnum<T>;
  url: () => ZodString;
  port: () => ZodNumber;
  durationMs: () => ZodNumber;
};
```

### 4.5 错误类型

```typescript
// 环境变量解析错误
class ConfigEnvError extends Error {
  name: 'ConfigEnvError';
}

// Schema 验证错误
class ConfigSchemaError extends Error {
  name: 'ConfigSchemaError';
  errors: z.ZodError['errors'];
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
| Tests | 79 passed |

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
7. **异步加载**：`@nestjs/config` v4 的 `forRoot` 是异步的，需要 `await`
8. **Schema 验证**：推荐使用 zod schema 确保配置正确性
9. **模块初始化**：
   - 在 `AppModule` 顶层使用 `await ConfigModule.forRoot()`
   - 在 `DynamicModule` 的 `imports` 中使用 `ConfigModule.forRootSync()`
   - `forRoot()` 返回 `Promise<DynamicModule>`，不能直接用于 `imports` 数组
10. **Provider 注册**：`ConfigService` 由 `ConfigModule` 自动提供，不要在模块的 `providers` 中重复注册

---

## 十、与其他模块集成

### 10.1 与 @oksai/redis 集成

```typescript
import { ConfigModule } from '@oksai/config';

@Module({
  imports: [
    ConfigModule.forFeature({
      name: 'redis',
      factory: (config) => ({
        url: config.getRequired('REDIS_URL'),
        keyPrefix: config.get('REDIS_KEY_PREFIX', { defaultValue: 'oksai:' }),
      }),
    }),
  ],
})
export class RedisModule {}
```

### 10.2 与 @oksai/database 集成

```typescript
import { ConfigModule, z } from '@oksai/config';

const databaseSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  maxConnections: z.number().int().min(1).default(20),
});

@Module({
  imports: [
    await ConfigModule.forRoot({
      namespaces: [
        {
          name: 'database',
          factory: (config) => ({
            host: config.get('DB_HOST', { defaultValue: 'localhost' }),
            port: config.getInt('DB_PORT', { defaultValue: 5432 }),
            database: config.getRequired('DB_NAME'),
            username: config.getRequired('DB_USER'),
            password: config.getRequired('DB_PASSWORD'),
            maxConnections: config.getInt('DB_POOL_SIZE', { defaultValue: 20 }),
          }),
          schema: databaseSchema,
        },
      ],
    }),
  ],
})
export class DatabaseModule {}
```

---

## 十一、迁移指南（v3 → v4）

### 11.1 forRoot 变为异步

```typescript
// v3（旧）
@Module({
  imports: [ConfigModule.forRoot()],
})

// v4（新）
@Module({
  imports: [await ConfigModule.forRoot()],
})
```

### 11.2 新增 forRootSync

如果不需要 .env 文件加载，可以使用同步版本：

```typescript
@Module({
  imports: [ConfigModule.forRootSync()],
})
```

### 11.3 新增 schema 验证

```typescript
await ConfigModule.forRoot({
  schema: z.object({
    PORT: z.coerce.number().default(3000),
  }),
})
```

### 11.4 新增命名空间

```typescript
await ConfigModule.forRoot({
  namespaces: [
    {
      name: 'database',
      factory: (config) => ({ ... }),
    },
  ],
})
```
