# Config 模块技术规范

> 版本：2.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/config` 提供统一的配置管理服务：

- **环境变量访问**：类型安全的配置读取
- **配置缓存**：避免重复读取环境变量
- **安全解析**：`getSafeNumber`、`getSafeJson` 返回 Result 类型
- **环境检测**：判断当前运行环境（开发/测试/生产）

### 1.2 设计原则

- **简洁优先**：不引入复杂的配置文件解析
- **类型安全**：提供不同类型的配置读取方法
- **错误友好**：安全方法返回 Result 类型，避免运行时错误
- **环境隔离**：支持多环境配置切换

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/config/
├── lib/
│   └── config.service.ts    # 配置服务和模块
├── spec/
│   └── config.spec.ts
└── index.ts
```

### 2.2 配置访问流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Application                               │
│  ┌─────────────────────────────────────────────────────┐   │
│ │ ConfigService                                        │   │
│ │  .get(key)         → string | undefined              │   │
│ │  .getRequired(key) → string                          │   │
│ │  .getNumber(key)   → number                          │   │
│ │  .getSafeNumber()  → Result<number, string>          │   │
│ │  .getBoolean(key)  → boolean                         │   │
│ │  .getJson(key)     → T                               │   │
│ │  .getSafeJson()    → Result<T, string>               │   │
│ │  .getEnum(key)     → T                               │   │
│ │  .isProduction()   → boolean                         │   │
│ └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    process.env                               │
│  NODE_ENV=production                                         │
│  DATABASE_URL=postgresql://...                               │
│  REDIS_URL=redis://...                                       │
│  PORT=3000                                                   │
│  DEBUG=false                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 基本使用

```typescript
import { ConfigService } from '@oksai/config';

const config = new ConfigService();

// 获取字符串配置
const dbUrl = config.get('DATABASE_URL');
const apiUrl = config.get('API_URL', 'http://localhost:8080');

// 获取必需配置（不存在时抛出错误）
const secretKey = config.getRequired('SECRET_KEY');

// 获取数字配置
const port = config.getNumber('PORT', 3000);
const timeout = config.getNumber('TIMEOUT_MS', 5000);

// 获取布尔配置
const debug = config.getBoolean('DEBUG', false);
const enableCache = config.getBoolean('ENABLE_CACHE', true);

// 环境检测
if (config.isProduction()) {
  // 生产环境逻辑
} else if (config.isDevelopment()) {
  // 开发环境逻辑
} else if (config.isTest()) {
  // 测试环境逻辑
}
```

### 3.2 安全数字解析

```typescript
import { ConfigService } from '@oksai/config';

const config = new ConfigService();

// 使用 Result 类型，避免 NaN 导致的运行时错误
const portResult = config.getSafeNumber('PORT', 3000);

if (portResult.isOk()) {
  console.log(`端口: ${portResult.value}`);
} else {
  console.error(`配置错误: ${portResult.error}`);
}

// 无默认值
const timeoutResult = config.getSafeNumber('TIMEOUT');
if (timeoutResult.isFail()) {
  // 处理配置缺失
  console.error(timeoutResult.error); // "配置项 TIMEOUT 未设置且无默认值"
}
```

### 3.3 JSON 配置解析

```typescript
// 获取 JSON 配置（自动解析）
const allowedOrigins = config.getJson<string[]>('ALLOWED_ORIGINS', []);
const dbConfig = config.getJson<{ host: string; port: number }>('DB_CONFIG', { host: 'localhost', port: 5432 });

// 安全解析
const featuresResult = config.getSafeJson<string[]>('FEATURES');
if (featuresResult.isOk()) {
  console.log(featuresResult.value);
}
```

### 3.4 枚举配置

```typescript
// 获取枚举类型的配置
const logLevel = config.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info');
```

### 3.5 整数和浮点数

```typescript
// 获取整数（截断小数部分）
const maxConnections = config.getInt('MAX_CONNECTIONS', 100);

// 获取浮点数
const ratio = config.getFloat('RATIO', 0.5);
```

### 3.6 缓存控制

```typescript
// 禁用缓存（每次读取最新值）
const config = new ConfigService({ enableCache: false });

// 清除所有缓存
config.clearCache();

// 清除特定 key 的缓存
config.clearCacheFor('PORT');
```

### 3.7 NestJS 集成

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

### 3.8 异步配置

```typescript
ConfigModule.forRootAsync({
  useFactory: async () => {
    // 异步加载配置
    return { enableCache: true };
  },
  isGlobal: true,
});
```

### 3.9 在服务中注入

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@oksai/config';

@Injectable()
export class DatabaseService {
  constructor(private readonly config: ConfigService) {}

  getConnectionConfig() {
    return {
      url: this.config.getRequired('DATABASE_URL'),
      poolSize: this.config.getNumber('DB_POOL_SIZE', 20),
      ssl: this.config.isProduction(),
    };
  }
}
```

---

## 四、API 参考

### 4.1 ConfigOptions

```typescript
interface ConfigOptions {
  /**
   * 是否启用缓存
   * @default true
   */
  enableCache?: boolean;
}
```

### 4.2 ConfigService

```typescript
class ConfigService {
  constructor(options?: ConfigOptions);

  // 基本方法
  get(key: string, defaultValue?: string): string | undefined;
  getRequired(key: string): string;

  // 数字方法
  getNumber(key: string, defaultValue?: number): number;
  getSafeNumber(key: string, defaultValue?: number): Result<number, string>;
  getInt(key: string, defaultValue?: number): number;
  getFloat(key: string, defaultValue?: number): number;

  // 布尔方法
  getBoolean(key: string, defaultValue?: boolean): boolean;

  // JSON 方法
  getJson<T>(key: string, defaultValue: T): T;
  getSafeJson<T>(key: string): Result<T, string>;

  // 枚举方法
  getEnum<T extends string>(key: string, enumValues: T[], defaultValue: T): T;

  // 环境检测
  getNodeEnv(): string;
  isProduction(): boolean;
  isDevelopment(): boolean;
  isTest(): boolean;

  // 缓存控制
  clearCache(): void;
  clearCacheFor(key: string): void;
}
```

### 4.3 ConfigModule

```typescript
interface ConfigModuleOptions {
  isGlobal?: boolean;
  configOptions?: ConfigOptions;
}

class ConfigModule {
  static forRoot(options?: ConfigModuleOptions): DynamicModule;
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => Promise<ConfigOptions> | ConfigOptions;
    inject?: unknown[];
    isGlobal?: boolean;
  }): DynamicModule;
}
```

---

## 五、布尔值解析规则

`getBoolean()` 方法的解析规则：

| 环境变量值 | 解析结果 |
|-----------|---------|
| `'true'` | `true` |
| `'TRUE'` | `true` |
| `'True'` | `true` |
| 其他任何值 | `false` |
| `undefined` | 使用默认值 |

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 91.17% |
| Functions | 100% |
| Lines | 100% |

---

## 七、环境变量约定

### 7.1 标准变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | `development`, `test`, `production` |
| `PORT` | 服务端口 | `3000` |
| `LOG_LEVEL` | 日志级别 | `debug`, `info`, `warn`, `error` |

### 7.2 命名规范

- 使用大写字母和下划线
- 按模块分组：`REDIS_URL`, `REDIS_KEY_PREFIX`
- 布尔值使用 `true`/`false`
- 敏感信息通过 secrets 管理

---

## 八、注意事项

1. **敏感信息**：不要在代码中硬编码敏感配置
2. **默认值**：为可选配置提供合理的默认值
3. **必需配置**：使用 `getRequired()` 确保关键配置存在
4. **类型转换**：注意 `getNumber()` 解析失败返回 `NaN`
5. **缓存**：启用缓存后，修改环境变量不会立即生效

---

## 九、与其他模块集成

### 9.1 与 @oksai/logger 集成

```typescript
setupLoggerModule({
  customProps: (req, res) => ({
    tenantId: tenantContextService.getTenantId(),
  }),
});
```

### 9.2 与 @oksai/redis 集成

```typescript
setupRedisModule({
  url: config.getRequired('REDIS_URL'),
  keyPrefix: config.get('REDIS_KEY_PREFIX'),
});
```

### 9.3 与 @oksai/database 集成

```typescript
const dbConfig = DatabaseConfig.create({
  host: config.get('DB_HOST', 'localhost'),
  port: config.getNumber('DB_PORT', 5432),
  database: config.getRequired('DB_NAME'),
  username: config.getRequired('DB_USER'),
  password: config.getRequired('DB_PASSWORD'),
  maxConnections: config.getNumber('DB_POOL_SIZE', 20),
});
```
