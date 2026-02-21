# App Kit 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/app-kit` 是平台组装层，提供：

- **统一装配入口**：`OksaiPlatformModule` 一站式配置
- **插件系统**：运行时可配置的功能装配
- **Swagger 集成**：双 UI（Scalar + Swagger）API 文档
- **常用服务重导出**：`ConfigService`、`TenantContextService`、`OksaiLoggerService`

### 1.2 设计目标

| 目标 | 说明 |
|:---|:---|
| **只做装配与组合** | 不引入业务模块，只组合基础设施 |
| **按需装配** | 各能力可选启用，支持不同场景 |
| **多应用复用** | platform-api / platform-admin 共享 |
| **环境驱动** | 通过环境变量控制功能开关 |

### 1.3 技术栈

| 依赖 | 版本 | 用途 |
|:---|:---|:---|
| @nestjs/common | ^11.0.0 | NestJS 核心 |
| @nestjs/swagger | ^11.0.0 | OpenAPI 规范生成 |
| @scalar/nestjs-api-reference | ^1.0.0 | Scalar UI |
| @oksai/config | workspace | 配置管理 |
| @oksai/context | workspace | 多租户上下文 |
| @oksai/logger | workspace | 日志服务 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/app-kit/
├── lib/
│   ├── modules/
│   │   └── oksai-platform.module.ts    # 平台装配模块
│   ├── plugins/
│   │   └── plugin-registry.ts          # 插件注册表
│   └── swagger/
│       ├── setup-swagger.ts            # Swagger 配置函数
│       └── index.ts
├── spec/
│   ├── oksai-platform.module.spec.ts
│   └── plugin-registry.spec.ts
└── index.ts
```

### 2.2 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  platform-api  │  │ platform-admin │  │   analytics    │ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘ │
│          └───────────────────┼───────────────────┘           │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 @oksai/app-kit                           ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │          OksaiPlatformModule.init()                  │││
│  │  │                                                       │││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │││
│  │  │  │ Config  │ │ Context │ │ Logger  │ │Swagger  │    │││
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │││
│  │  │  │ CQRS    │ │  EDA    │ │Plugins  │ │ Auth    │    │││
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.3 能力矩阵

| 能力 | 必选/可选 | 模块 | 说明 |
|:---|:---|:---|:---|
| 配置管理 | 必选 | `@oksai/config` | 环境变量、配置文件 |
| 请求上下文 | 必选 | `@oksai/context` | CLS，多租户隔离 |
| 日志 | 必选 | `@oksai/logger` | 结构化日志 |
| API 文档 | 可选 | `@nestjs/swagger` + Scalar | Swagger UI + Scalar UI |
| CQRS | 可选 | `@oksai/cqrs` | CommandBus/QueryBus |
| EDA | 可选 | `@oksai/eda` | 事件驱动架构 |
| 插件 | 可选 | 插件注册表 | 启动期装配 |

---

## 三、使用方式

### 3.1 平台模块

#### 同步初始化

```typescript
import { Module } from '@nestjs/common';
import { OksaiPlatformModule } from '@oksai/app-kit';

@Module({
  imports: [
    OksaiPlatformModule.init({
      isGlobal: true,
      enableCqrs: true,
      enableEda: true,
      enableLogger: true,
      logLevel: 'info',
      prettyLog: false,
      plugins: enabledPlugins
    })
  ]
})
export class AppModule {}
```

#### 异步初始化

```typescript
import { Module } from '@nestjs/common';
import { OksaiPlatformModule } from '@oksai/app-kit';
import { ConfigService } from '@oksai/config';

@Module({
  imports: [
    OksaiPlatformModule.initAsync({
      useFactory: (config: ConfigService) => ({
        isGlobal: true,
        enableCqrs: true,
        enableEda: true,
        logLevel: config.get('LOG_LEVEL') ?? 'info',
        prettyLog: config.isDevelopment()
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

### 3.2 插件系统

#### 注册插件

```typescript
import { registerPlugins } from '@oksai/app-kit';
import { DemoPluginModule } from './plugins/demo-plugin.module';

// 注册可用插件清单
registerPlugins({
  demo: { name: 'demo', module: DemoPluginModule }
});
```

#### 环境变量启用

```bash
# .env
PLUGINS_ENABLED=demo
```

#### 解析启用的插件

```typescript
import { resolvePluginsFromEnv } from '@oksai/app-kit';

const enabledPlugins = resolvePluginsFromEnv();
```

### 3.3 Swagger API 文档

#### 基本配置

```typescript
import { setupSwagger } from '@oksai/app-kit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  setupSwagger(app, {
    title: 'Platform API',
    description: '多租户 SaaS 数据分析平台 API',
    version: '1.0.0',
    swaggerPath: '/swagger',
    scalarPath: '/docs',
    enableBearerAuth: true,
    withFastify: false
  });
  
  await app.listen(3000);
}
```

#### 访问路径

| 路径 | 说明 |
|:---|:---|
| `/docs` | Scalar UI（现代化界面） |
| `/swagger` | Swagger UI（传统界面） |

#### 环境控制

```typescript
// 默认：开发环境启用，生产环境禁用
// 手动控制
setupSwagger(app, {
  title: 'API',
  enabled: process.env.NODE_ENV !== 'production'
});
```

---

## 四、API 参考

### 4.1 OksaiPlatformModuleOptions

```typescript
interface OksaiPlatformModuleOptions {
  /** 是否全局模块（默认 true） */
  isGlobal?: boolean;

  /** 启用 CQRS（默认 false） */
  enableCqrs?: boolean;

  /** 启用 EDA（默认 false） */
  enableEda?: boolean;

  /** 启用日志（默认 true） */
  enableLogger?: boolean;

  /** 日志级别（默认 'info'） */
  logLevel?: string;

  /** 是否启用美化日志（默认 false） */
  prettyLog?: boolean;

  /** 启用的插件列表 */
  plugins?: PluginInput[];
}
```

### 4.2 SwaggerOptions

```typescript
interface SwaggerOptions {
  /** 是否启用 Swagger */
  enabled?: boolean;

  /** API 文档标题 */
  title: string;

  /** API 文档描述 */
  description?: string;

  /** API 版本（默认 '1.0.0'） */
  version?: string;

  /** Swagger UI 路径（默认 '/swagger'） */
  swaggerPath?: string;

  /** Scalar UI 路径（默认 '/docs'） */
  scalarPath?: string;

  /** 是否启用 Bearer Auth（默认 true） */
  enableBearerAuth?: boolean;

  /** 生产环境是否禁用（默认 true） */
  disableInProduction?: boolean;

  /** Scalar 主题（默认 'purple'） */
  scalarTheme?: 'alternate' | 'default' | 'moon' | 'purple' | 'solarized';

  /** 是否使用 Fastify 适配器（默认 false） */
  withFastify?: boolean;
}
```

### 4.3 插件注册表 API

```typescript
// 注册插件
function registerPlugins(
  plugins: Record<string, PluginInput>,
  options?: { allowOverride?: boolean }
): void;

// 从环境变量解析启用的插件
function resolvePluginsFromEnv(options?: {
  envName?: string;     // 默认 'PLUGINS_ENABLED'
  separator?: string;   // 默认 ','
  strict?: boolean;     // 默认 true
}): PluginInput[];

// 获取已注册插件名称列表
function getRegisteredPluginNames(): string[];

// 清空注册表
function clearPluginRegistry(): void;
```

---

## 五、导出内容

### 5.1 模块

```typescript
export { OksaiPlatformModule } from './lib/modules/oksai-platform.module';
```

### 5.2 插件系统

```typescript
export {
  registerPlugins,
  clearPluginRegistry,
  getRegisteredPluginNames,
  resolvePluginsFromEnv,
  type PluginInput,
  type RegisterPluginsOptions,
  type ResolvePluginsFromEnvOptions
} from './lib/plugins/plugin-registry';
```

### 5.3 Swagger

```typescript
export {
  setupSwagger,
  type SwaggerOptions,
  type SwaggerSetupResult,
  type OAuth2Options
} from './lib/swagger';
```

### 5.4 重导出

```typescript
export { OksaiLoggerService } from '@oksai/logger';
export { ConfigService } from '@oksai/config';
export { TenantContextService } from '@oksai/context';
```

---

## 六、典型使用场景

### 6.1 platform-api

```typescript
// apps/platform-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { OksaiPlatformModule, registerPlugins, resolvePluginsFromEnv } from '@oksai/app-kit';
import { PLATFORM_PLUGINS } from './plugins';

registerPlugins(PLATFORM_PLUGINS);

@Module({
  imports: [
    OksaiPlatformModule.init({
      isGlobal: true,
      enableCqrs: true,
      enableEda: true,
      plugins: resolvePluginsFromEnv()
    })
  ],
  controllers: [HealthController]
})
export class AppModule {}
```

```typescript
// apps/platform-api/src/main.ts
import { setupSwagger, OksaiLoggerService } from '@oksai/app-kit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const logger = await app.resolve(OksaiLoggerService);
  app.useLogger(logger);
  
  setupSwagger(app, {
    title: 'Oksai Platform API',
    description: '多租户 SaaS 数据分析平台 API',
    version: '1.0.0',
    withFastify: true
  });
  
  await app.listen(3000);
}
```

### 6.2 platform-admin-api

```typescript
// apps/platform-admin-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { OksaiPlatformModule } from '@oksai/app-kit';

@Module({
  imports: [
    OksaiPlatformModule.init({
      isGlobal: true,
      enableCqrs: false,
      enableEda: false,
      prettyLog: process.env.NODE_ENV !== 'production'
    })
  ],
  controllers: [HealthController, SystemController]
})
export class AppModule {}
```

---

## 七、设计原则

### 7.1 单一职责

- **只做装配与组合**，不引入业务模块
- 依赖通过 `workspace:*` 引用其他基础设施模块

### 7.2 依赖倒置

- 依赖抽象接口（`ConfigService`、`TenantContextService`）
- 不依赖具体实现

### 7.3 开闭原则

- 新增能力通过选项启用
- 新增插件通过注册表扩展

---

## 八、测试覆盖

| 指标 | 数值 |
|:---|:---|
| Test Suites | 2 passed |
| Tests | 29 passed |

---

## 九、与其他模块的关系

```
┌─────────────────────────────────────────────────────────────┐
│                    @oksai/app-kit                            │
│                      (组装层)                                │
├─────────────────────────────────────────────────────────────┤
│                           │                                  │
│       ┌───────────────────┼───────────────────┐             │
│       ▼                   ▼                   ▼             │
│  ┌─────────┐       ┌─────────┐       ┌─────────┐           │
│  │ Config  │       │ Context │       │ Logger  │           │
│  └─────────┘       └─────────┘       └─────────┘           │
│       │                   │                   │             │
│       └───────────────────┼───────────────────┘             │
│                           ▼                                  │
│                    Shared Infrastructure                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 十、注意事项

1. **插件注册时机**：必须在 `OksaiPlatformModule.init()` 之前注册
2. **环境变量驱动**：通过 `PLUGINS_ENABLED` 控制启用哪些插件
3. **Swagger 生产环境**：默认禁用，避免暴露 API 结构
4. **Fastify 适配器**：使用 Fastify 时需设置 `withFastify: true`
5. **重导出服务**：通过 `@oksai/app-kit` 导入常用服务，避免多个 import

---

## 十一、修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0.0 | 2026-02-22 | 初始版本 |
