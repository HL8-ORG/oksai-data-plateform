# 环境变量、配置与常量的关系机制

> 版本：1.0.0  
> 更新日期：2026-02-22

---

## 一、三层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           应用代码                                   │
│                                                                      │
│   使用 AppConfiguration 对象（类型安全、业务友好）                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        @oksai/config                                 │
│                                                                      │
│   职责：                                                             │
│   - 从 process.env 读取环境变量                                      │
│   - 使用 zod schema 验证                                             │
│   - 使用 constants 作为默认值                                        │
│   - 提供 ConfigService 和 env 辅助对象                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
┌───────────────────────┐       ┌─────────────────────────────────────┐
│   @oksai/constants    │       │            .env 文件                │
│                       │       │                                      │
│   职责：              │       │   职责：                             │
│   - 默认值            │       │   - 环境特定配置                     │
│   - 标识符常量        │       │   - 敏感信息（不提交）               │
│   - 零依赖            │       │   - 覆盖默认值                       │
└───────────────────────┘       └─────────────────────────────────────┘
```

---

## 二、职责划分

### 2.1 @oksai/constants（常量层）

**职责：提供不可变的默认值和标识符**

| 类型 | 示例 | 用途 |
|:---|:---|:---|
| 默认值 | `DEFAULT_PLATFORM_API_PORT = 3000` | 作为 config schema 的 default |
| 标识符 | `REQUEST_ID_HEADER = 'x-request-id'` | 避免魔法字符串散落 |
| 业务常量 | `MAX_PAGE_SIZE = 100` | 业务规则边界 |

**特点：**
- 零依赖
- 编译时确定
- 不涉及运行时环境

### 2.2 .env 文件（环境层）

**职责：提供环境特定的配置**

| 环境 | 文件 | 用途 |
|:---|:---|:---|
| 开发 | `.env.development` | 本地开发配置 |
| 测试 | `.env.test` | 测试环境配置 |
| 生产 | `.env.production` | 生产环境配置 |
| 本地覆盖 | `.env.local` | 不提交，个人配置 |

**特点：**
- 不提交到版本控制（敏感信息）
- 覆盖 constants 的默认值
- 环境隔离

### 2.3 @oksai/config（配置层）

**职责：整合 constants 默认值和 .env 覆盖值**

```typescript
// app.config.ts
import { z } from 'zod';
import { DEFAULT_PLATFORM_API_PORT, DEFAULT_LOG_LEVEL } from '@oksai/constants';

export const appConfigSchema = z.object({
	// 使用 constants 作为默认值
	PORT: z.coerce.number().default(DEFAULT_PLATFORM_API_PORT),
	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
		.default(DEFAULT_LOG_LEVEL),
});
```

**特点：**
- 依赖 constants（作为默认值）
- 读取 process.env（来自 .env 文件）
- 提供 zod 验证
- 提供类型安全的配置访问

---

## 三、优先级规则

```
环境变量 > .env 文件 > @oksai/constants 默认值
```

**示例：**

```
// 1. constants 定义默认值
DEFAULT_PLATFORM_API_PORT = 3000

// 2. .env 文件可以覆盖
PORT=4000

// 3. 环境变量最高优先级
PORT=5000 npm start

// 最终结果: 5000
```

---

## 四、使用指南

### 4.1 何时使用 constants

```typescript
// ✅ 正确：作为 config schema 的默认值
import { DEFAULT_PLATFORM_API_PORT } from '@oksai/constants';

export const appConfigSchema = z.object({
	PORT: z.coerce.number().default(DEFAULT_PLATFORM_API_PORT),
});

// ✅ 正确：在装饰器、守卫中使用标识符
import { PUBLIC_METHOD_METADATA } from '@oksai/constants';
SetMetadata(PUBLIC_METHOD_METADATA, true);

// ✅ 正确：业务规则边界
import { MAX_PAGE_SIZE } from '@oksai/constants';
const pageSize = Math.min(requestedSize, MAX_PAGE_SIZE);
```

### 4.2 何时使用 .env 文件

```bash
# ✅ 正确：环境特定配置
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### 4.3 何时使用 config

```typescript
// ✅ 正确：通过 ConfigService 读取配置
@Injectable()
export class MyService {
	constructor(private readonly config: ConfigService) {}

	getConfig() {
		return {
			port: this.config.getInt('PORT'),
			dbUrl: this.config.getRequired('DATABASE_URL'),
		};
	}
}

// ✅ 正确：使用应用配置对象（推荐）
const appConfig = createAppConfiguration(config.validate(appConfigSchema));
await app.listen(appConfig.port);
```

---

## 五、最佳实践

### 5.1 添加新配置项

```
1. 在 constants 中定义默认值（如果需要）
2. 在 config schema 中定义验证规则，引用 constants
3. 在 .env.example 中添加示例
4. 在实际 .env 中配置值
```

**示例：**

```typescript
// 1. constants/api.ts
export const DEFAULT_HTTP_TIMEOUT_MS = 30000;

// 2. app.config.ts
import { DEFAULT_HTTP_TIMEOUT_MS } from '@oksai/constants';

export const appConfigSchema = z.object({
	HTTP_TIMEOUT_MS: z.coerce.number()
		.min(1000)
		.max(300000)
		.default(DEFAULT_HTTP_TIMEOUT_MS),
});

// 3. .env.example
HTTP_TIMEOUT_MS=30000

// 4. .env
HTTP_TIMEOUT_MS=60000
```

### 5.2 敏感信息处理

```typescript
// ❌ 错误：敏感信息放在 constants
export const JWT_SECRET = 'hardcoded-secret';  // 不要这样做！

// ✅ 正确：敏感信息必须通过环境变量
export const appConfigSchema = z.object({
	JWT_SECRET: z.string().min(32),  // 无默认值，必须配置
});
```

### 5.3 配置对象模式

```typescript
// 推荐：创建类型安全的应用配置对象
export interface AppConfiguration {
	readonly port: number;
	readonly nodeEnv: string;
	readonly isProduction: boolean;
	// ...
}

export function createAppConfiguration(config: AppConfig): AppConfiguration {
	return {
		port: config.PORT,
		nodeEnv: config.NODE_ENV,
		isProduction: config.NODE_ENV === 'production',
	};
}

// 使用
const appConfig = createAppConfiguration(config.validate(appConfigSchema));
```

---

## 六、反模式

### 6.1 不要在 constants 中硬编码环境特定值

```typescript
// ❌ 错误
export const DATABASE_URL = 'postgresql://localhost:5432/dev';

// ✅ 正确
// DATABASE_URL 应该通过环境变量配置
```

### 6.2 不要在业务代码中直接使用 constants 作为运行时值

```typescript
// ❌ 错误：绕过配置层
import { DEFAULT_PLATFORM_API_PORT } from '@oksai/constants';
await app.listen(DEFAULT_PLATFORM_API_PORT);

// ✅ 正确：通过配置层
const appConfig = createAppConfiguration(config.validate(appConfigSchema));
await app.listen(appConfig.port);
```

### 6.3 不要在 constants 中依赖 config

```typescript
// ❌ 错误：constants 依赖 config
import { env } from '@oksai/config';
export const DYNAMIC_VALUE = env.string('SOME_KEY');

// ✅ 正确：constants 保持零依赖
export const DEFAULT_SOME_VALUE = 'default';
// 在 config 中使用
SOME_KEY: z.string().default(DEFAULT_SOME_VALUE),
```

---

## 七、总结

| 层级 | 职责 | 依赖 | 变更频率 |
|:---|:---|:---|:---|
| **constants** | 默认值、标识符 | 无 | 极低 |
| **.env** | 环境配置 | 无 | 按环境 |
| **config** | 配置整合与验证 | constants | 低 |

**核心原则：**

1. **constants 是静态的**：编译时确定，不涉及运行时
2. **.env 是动态的**：环境特定，覆盖默认值
3. **config 是桥梁**：整合两者，提供类型安全访问
4. **敏感信息必须走环境变量**：永远不要硬编码
