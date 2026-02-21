# Config 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/config` 提供统一的配置管理服务：

- **环境变量访问**：类型安全的配置读取
- **环境检测**：判断当前运行环境（开发/测试/生产）
- **NestJS 集成**：支持依赖注入

### 1.2 设计原则

- **简洁优先**：不引入复杂的配置文件解析
- **类型安全**：提供不同类型的配置读取方法
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
│  │ ConfigService                                        │   │
│  │  .get(key)         → string | undefined              │   │
│  │  .getRequired(key) → string                          │   │
│  │  .getNumber(key)   → number                          │   │
│  │  .getBoolean(key)  → boolean                         │   │
│  │  .isProduction()   → boolean                         │   │
│  └─────────────────────────────────────────────────────┘   │
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
const apiUrl = config.get('API_URL', 'http://localhost:8080'); // 带默认值

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

### 3.2 NestJS 集成

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

### 3.3 在服务中注入

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

### 4.1 ConfigService

```typescript
class ConfigService {
  /**
   * 获取配置值
   * @param key - 配置键名（环境变量名）
   * @param defaultValue - 默认值
   * @returns 配置值或默认值
   */
  get(key: string, defaultValue?: string): string | undefined;

  /**
   * 获取必需的配置值
   * @param key - 配置键名
   * @returns 配置值
   * @throws Error 如果配置不存在
   */
  getRequired(key: string): string;

  /**
   * 获取数字类型的配置值
   * @param key - 配置键名
   * @param defaultValue - 默认值
   * @returns 数字类型的配置值（解析失败返回 NaN）
   */
  getNumber(key: string, defaultValue?: number): number;

  /**
   * 获取布尔类型的配置值
   * @param key - 配置键名
   * @param defaultValue - 默认值
   * @returns 布尔类型的配置值
   */
  getBoolean(key: string, defaultValue?: boolean): boolean;

  /**
   * 获取 Node 环境标识
   * @returns 环境标识（development/test/production）
   */
  getNodeEnv(): string;

  /**
   * 检查是否为生产环境
   */
  isProduction(): boolean;

  /**
   * 检查是否为开发环境
   */
  isDevelopment(): boolean;

  /**
   * 检查是否为测试环境
   */
  isTest(): boolean;
}
```

### 4.2 ConfigModule

```typescript
class ConfigModule {
  /**
   * 创建配置模块
   * @param options - 模块选项
   * @param options.isGlobal - 是否全局模块（默认 true）
   */
  static forRoot(options?: { isGlobal?: boolean }): DynamicModule;
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
| Branches | 100% |
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

---

## 九、与其他模块集成

### 9.1 与 @oksai/logger 集成

```typescript
const config = app.get(ConfigService);

setupLoggerModule({
  level: config.get('LOG_LEVEL', 'info'),
  pretty: config.isDevelopment(),
});
```

### 9.2 与 @oksai/redis 集成

```typescript
const config = app.get(ConfigService);

setupRedisModule({
  url: config.getRequired('REDIS_URL'),
  keyPrefix: config.get('REDIS_KEY_PREFIX'),
});
```

### 9.3 与 @oksai/database 集成

```typescript
const config = app.get(ConfigService);

const dbConfig = DatabaseConfig.create({
  host: config.get('DB_HOST', 'localhost'),
  port: config.getNumber('DB_PORT', 5432),
  database: config.getRequired('DB_NAME'),
  username: config.getRequired('DB_USER'),
  password: config.getRequired('DB_PASSWORD'),
  maxConnections: config.getNumber('DB_POOL_SIZE', 20),
});
```
