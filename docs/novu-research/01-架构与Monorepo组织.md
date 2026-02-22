# Novu 项目架构与 Monorepo 组织研究报告

## 一、项目概述

Novu 是一个开源的通知基础设施平台，采用 **Nx + pnpm workspaces** 构建 Monorepo。它提供统一的多渠道通知 API，支持邮件、短信、推送、应用内消息和聊天等多种渠道。

### 技术栈概览

| 层级 | 技术选型 |
|:---|:---|
| **运行时** | Node.js 20+ |
| **语言** | TypeScript 5.6.2 |
| **包管理** | pnpm 10.16.1 |
| **构建系统** | Nx 21.3.11 |
| **后端框架** | NestJS |
| **前端框架** | React 19 + Vite 5 |
| **数据库** | MongoDB 8.0 + Redis + ClickHouse |
| **消息队列** | BullMQ |

---

## 二、Monorepo 结构

### 2.1 目录结构总览

```
novu/
├── apps/                      # 应用程序（可独立部署的服务）
│   ├── api/                   # 核心后端 API 服务
│   ├── dashboard/             # React 管理面板
│   ├── worker/                # 后台任务处理服务
│   ├── ws/                    # WebSocket 实时服务
│   ├── webhook/               # Webhook 投递服务
│   └── inbound-mail/          # 邮件接收解析服务
│
├── libs/                      # 共享库（内部使用）
│   ├── dal/                   # 数据访问层
│   ├── application-generic/   # 通用业务逻辑
│   ├── testing/               # 测试工具库
│   ├── automation/            # Nx 代码生成器
│   ├── internal-sdk/          # 内部 SDK（自动生成）
│   ├── maily-core/            # 邮件编辑器核心
│   ├── maily-render/          # 邮件渲染引擎
│   └── notifications/         # 通知相关逻辑
│
├── packages/                  # 发布包（NPM 发布）
│   ├── framework/             # 代码优先的通知工作流 SDK
│   ├── js/                    # JavaScript SDK
│   ├── react/                 # React SDK
│   ├── react-native/          # React Native SDK
│   ├── nextjs/                # Next.js SDK
│   ├── providers/             # 渠道提供商适配器
│   ├── shared/                # 共享类型和工具
│   ├── stateless/             # 无状态通知管理
│   ├── novu/                  # CLI 工具
│   └── add-inbox/             # Inbox 安装工具
│
├── enterprise/                # 企业版特性（商业许可）
│   ├── packages/              # 企业版扩展包
│   │   ├── api/               # API 企业功能
│   │   ├── auth/              # 高级认证
│   │   ├── billing/           # 计费系统
│   │   ├── dal/               # 企业数据层
│   │   ├── shared-services/   # 共享企业服务
│   │   └── translation/       # 多语言支持
│   └── workers/               # 企业版 Worker
│
├── playground/                # 示例应用
│   ├── nextjs/                # Next.js 示例
│   └── nestjs/                # NestJS 示例
│
├── docker/                    # Docker 配置
│   ├── community/             # 社区版部署
│   └── local/                 # 本地开发环境
│
└── scripts/                   # 构建和部署脚本
```

### 2.2 Apps 应用详解

#### 2.2.1 @novu/api-service（核心 API）

**职责**：提供 RESTful API，处理认证、业务逻辑和核心操作。

```json
{
  "name": "@novu/api-service",
  "version": "3.13.0",
  "nx": { "tags": ["type:app"] }
}
```

**技术栈**：
- NestJS 框架
- MongoDB（通过 Mongoose）
- BullMQ 队列
- ClickHouse（分析数据）
- Clerk/Better-Auth 认证

**核心模块**（`apps/api/src/app/`）：
- `auth` - 认证授权
- `billing` - 计费管理
- `integrations` - 第三方集成
- `notifications` - 通知管理
- `environments-v1/v2` - 环境管理
- `subscribers` - 订阅者管理

#### 2.2.2 @novu/dashboard（管理面板）

**职责**：提供现代化的 React 管理界面。

```json
{
  "name": "@novu/dashboard",
  "version": "3.13.2",
  "type": "module",
  "nx": { "tags": ["type:app"] }
}
```

**技术栈**：
- React 19 + TypeScript
- Vite 5 构建工具
- TanStack Query（数据获取）
- Radix UI（组件库）
- Tailwind CSS 4
- Clerk 认证
- Playwright（E2E 测试）

**目录结构**（`apps/dashboard/src/`）：
```
src/
├── api/              # API 客户端
├── components/       # UI 组件
├── config/           # 配置
├── context/          # React Context
├── hooks/            # 自定义 Hooks
├── pages/            # 页面组件
├── routes/           # 路由配置
└── utils/            # 工具函数
```

#### 2.2.3 @novu/worker（后台任务处理）

**职责**：处理异步任务、定时任务和消息队列。

```json
{
  "name": "@novu/worker",
  "version": "3.13.0",
  "dependencies": {
    "@nestjs/schedule": "^4.1.1",
    "bullmq": "^3.10.2"
  }
}
```

**主要功能**：
- 消息发送处理
- 定时任务执行
- 工作流步骤处理
- 消息摘要生成

#### 2.2.4 @novu/ws（WebSocket 服务）

**职责**：提供实时通信支持。

```json
{
  "name": "@novu/ws",
  "dependencies": {
    "@nestjs/websockets": "10.4.18",
    "@nestjs/platform-socket.io": "10.4.18",
    "socket.io": "^4.7.2"
  }
}
```

**功能**：
- 实时通知推送
- Inbox 实时更新
- Redis 适配器（集群支持）

#### 2.2.5 @novu/webhook（Webhook 投递）

**职责**：处理外部 Webhook 回调。

#### 2.2.6 @novu/inbound-mail（邮件接收）

**职责**：接收并解析入站邮件。

```json
{
  "dependencies": {
    "smtp-server": "^1.4.0",
    "mailparser": "^0.6.0"
  }
}
```

### 2.3 Libs 共享库详解

#### 2.3.1 @novu/dal（数据访问层）

**职责**：封装 MongoDB 数据访问逻辑。

```typescript
// libs/dal/src/repositories/
├── base-repository.ts      # 基础仓储
├── user/                   # 用户仓储
├── organization/           # 组织仓储
├── environment/            # 环境仓储
├── subscriber/             # 订阅者仓储
├── notification/           # 通知仓储
├── integration/            # 集成仓储
├── message/                # 消息仓储
└── ...                     # 更多仓储
```

**关键依赖**：
- `mongoose` - MongoDB ODM
- `mongoose-delete` - 软删除支持

#### 2.3.2 @novu/application-generic（通用业务逻辑）

**职责**：提供跨服务共享的业务逻辑。

```typescript
// libs/application-generic/src/
├── commands/              # CQRS 命令
├── services/              # 业务服务
│   ├── auth/             # 认证服务
│   ├── bull-mq/          # 队列服务
│   ├── cache/            # 缓存服务
│   ├── storage/          # 存储服务
│   └── queues/           # 队列管理
├── usecases/             # 用例层
├── schemas/              # 数据 Schema
├── dtos/                 # 数据传输对象
└── decorators/           # 装饰器
```

**关键特性**：
- CQRS 模式实现
- OpenTelemetry 集成
- 多租户支持
- LaunchDarkly 特性开关

#### 2.3.3 @novu/testing（测试工具）

**职责**：提供测试夹具和 Mock 工具。

#### 2.3.4 @novu/automation（Nx 生成器）

**职责**：提供代码生成器。

```json
{
  "generators": "./generators.json",
  "scripts": {
    "generate:provider": "pnpm nx g automation:provider"
  }
}
```

### 2.4 Packages 发布包详解

#### 2.4.1 @novu/framework（核心框架）

**职责**：代码优先的通知工作流 SDK。

```typescript
// 多框架支持
exports: {
  ".": "...",
  "./express": "...",
  "./nest": "...",
  "./next": "...",
  "./nuxt": "...",
  "./h3": "...",
  "./lambda": "...",
  "./sveltekit": "...",
  "./remix": "...",
  "./internal": "..."
}
```

**特性**：
- Zod Schema 验证
- 多运行时支持
- JSON Schema 集成

#### 2.4.2 @novu/providers（提供商适配器）

**职责**：集成 50+ 通知渠道提供商。

```
packages/providers/src/lib/
├── email/          # 邮件提供商
│   ├── sendgrid/   # SendGrid
│   ├── ses/        # AWS SES
│   ├── mailgun/    # Mailgun
│   ├── resend/     # Resend
│   ├── postmark/   # Postmark
│   └── ...
├── sms/            # 短信提供商
│   ├── twilio/     # Twilio
│   ├── nexmo/      # Vonage
│   ├── plivo/      # Plivo
│   ├── infobip/    # Infobip
│   └── ...
├── push/           # 推送提供商
│   ├── fcm/        # Firebase
│   ├── apn/        # Apple Push
│   └── ...
└── chat/           # 聊天提供商
    ├── slack/      # Slack
    ├── discord/    # Discord
    ├── teams/      # MS Teams
    └── ...
```

#### 2.4.3 @novu/react / @novu/js（前端 SDK）

**职责**：提供 Inbox 组件和客户端 SDK。

```typescript
// @novu/react 导出结构
exports: {
  ".": "...",
  "./hooks": "...",
  "./themes": "...",
  "./server": "...",
  "./internal": "..."
}
```

**技术特点**：
- Solid.js 内核（高性能）
- 双模块格式（ESM + CJS）
- 服务端渲染支持

#### 2.4.4 @novu/shared（共享类型）

**职责**：共享类型定义和工具函数。

```typescript
exports: {
  ".": {
    "require": "./dist/cjs/index.js",
    "import": "./dist/esm/index.js"
  },
  "./utils": {
    "require": "./dist/cjs/utils/index.js",
    "import": "./dist/esm/utils/index.js"
  }
}
```

### 2.5 Enterprise 企业版特性

**企业版模块**（位于 `enterprise/packages/`）：

| 模块 | 职责 |
|:---|:---|
| `@novu/ee-api` | API 企业功能扩展 |
| `@novu/ee-auth` | SSO、LDAP 高级认证 |
| `@novu/ee-billing` | 计费和订阅管理 |
| `@novu/ee-dal` | 企业数据层扩展 |
| `@novu/ee-shared-services` | 共享企业服务 |
| `@novu/ee-translation` | 多语言翻译服务 |

**企业版 Worker**（位于 `enterprise/workers/`）：

| Worker | 职责 |
|:---|:---|
| `scheduler` | 高级任务调度 |
| `socket` | 企业级实时通信 |
| `step-resolver` | 工作流步骤解析 |

**企业版架构特点**：
- 源码位于 `.source` 子模块（Git Submodule）
- 通过符号链接连接到 `enterprise/packages/*/src`
- 可选依赖方式加载（`optionalDependencies`）

---

## 三、构建系统分析

### 3.1 Nx 配置

```json
{
  "parallel": 4,
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],  // 依赖图感知构建
      "cache": true             // 构建缓存
    },
    "test": { "cache": true },
    "lint": { "cache": true },
    "lint-biome": {
      "inputs": ["default", "{workspaceRoot}/biome.json"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/src/test-setup.[jt]s",
      "!{projectRoot}/test-setup.[jt]s",
      "!{projectRoot}/biome.json"
    ],
    "sharedGlobals": [
      { "runtime": "node --version" }
    ]
  },
  "release": {
    "changelog": {
      "workspaceChangelog": false,
      "projectChangelogs": true
    },
    "projectsRelationship": "independent",
    "conventionalCommits": true,
    "groups": {
      "apps": {
        "projects": [
          "@novu/api-service", "@novu/dashboard", "@novu/inbound-mail",
          "@novu/webhook", "@novu/worker", "@novu/ws"
        ]
      },
      "packages": {
        "projects": [
          "novu", "@novu/framework", "@novu/js", "@novu/react",
          "@novu/react-native", "@novu/nextjs", "@novu/providers",
          "@novu/shared", "@novu/stateless"
        ]
      }
    }
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "canTrackAnalytics": false,
        "nxCloudId": "61d98cffc3343830d132e541"
      }
    }
  }
}
```

### 3.2 缓存策略

| 策略 | 说明 |
|:---|:---|
| **构建缓存** | `build` target 启用缓存 |
| **测试缓存** | `test` target 启用缓存 |
| **Lint 缓存** | `lint` target 启用缓存 |
| **Nx Cloud** | 使用 Nx Cloud 分布式缓存 |
| **生产输入** | 排除测试文件和配置文件 |

### 3.3 构建依赖图

```
                    @novu/shared
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    @novu/stateless  @novu/dal   @novu/framework
          │              │              │
          └──────┬───────┘              │
                 │                      │
          @novu/providers               │
                 │                      │
          @novu/application-generic     │
                 │                      │
    ┌────────────┼────────────┐         │
    │            │            │         │
 @novu/api   @novu/worker  @novu/ws    │
    │            │            │         │
    └────────────┴────────────┘         │
                 │                      │
          @novu/testing                 │
                 │                      │
                 └──────────┬───────────┘
                            │
                    @novu/js (packages)
                            │
                ┌───────────┼───────────┐
                │           │           │
          @novu/react  @novu/nextjs  @novu/react-native
```

### 3.4 构建脚本

```json
{
  "scripts": {
    "build": "nx run-many --target=build --all --exclude=nextjs,nestjs",
    "build:v2": "nx run-many --target=build --all --projects=@novu/api-service,@novu/worker,@novu/ws,@novu/dashboard,tag:type:package",
    "build:packages": "nx run-many --target=build --all --projects=tag:type:package",
    "build:api": "nx build @novu/api-service",
    "build:dashboard": "nx build @novu/dashboard",
    "build:worker": "nx build @novu/worker",
    "build-ee": "nx run-many --target=build-ee --all"
  }
}
```

---

## 四、依赖管理

### 4.1 pnpm Workspace 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'libs/*'
  - 'enterprise/packages/*'
  - 'playground/*'
  - '!**/test/**'

minimumReleaseAge: 1440  # 24 小时发布延迟
```

```ini
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
fetch-retry-maxtimeout=10000
enable-pre-post-scripts=true
```

### 4.2 版本锁定策略

```json
{
  "pnpm": {
    "overrides": {
      "body-parser@<1.20.3": "^1.20.3",
      "braces@<2.3.1": "^2.3.1",
      "nth-check": "^2.1.1",
      "postcss@<8.4.31": "^8.4.31",
      "semver@>=7.0.0 <7.5.2": "^7.5.2",
      "tar": "7.1.0",
      "@nestjs/common@>=10.0.0 <11.0.0": "10.4.18",
      "@swc/core@>=1.0.0 <2.0.0": "1.7.26",
      "mongodb@>=4.0.0 <5.0.0": "5.9.2",
      "vite@>=5.0.0 <5.4.15": "^5.4.21",
      "next@>=13.0.0 <14.2.32": "^14.2.35",
      "next@>=15.0.0 <15.4.7": "^15.4.10"
    }
  }
}
```

### 4.3 onlyBuiltDependencies 配置

```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "@swc/core",
      "bcrypt",
      "esbuild",
      "sharp",
      "nx",
      "@nestjs/core",
      "@sentry/profiling-node",
      "@tailwindcss/oxide",
      "protobufjs"
    ]
  }
}
```

### 4.4 核心依赖分析

| 包名 | 版本 | 用途 |
|:---|:---|:---|
| `@nestjs/common` | 10.4.18 | 后端框架核心 |
| `mongoose` | ^8.9.5 | MongoDB ODM |
| `bullmq` | ^3.10.2 | 消息队列 |
| `ioredis` | 5.3.2 | Redis 客户端 |
| `socket.io` | ^4.7.2 | WebSocket 服务端 |
| `react` | ^19.2.3 | 前端框架 |
| `vite` | ^5.4.21 | 前端构建工具 |
| `zod` | ^3.23.8 | Schema 验证 |
| `axios` | ^1.9.0 | HTTP 客户端 |

---

## 五、项目配置

### 5.1 TypeScript 配置策略

#### 根配置

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "downlevelIteration": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "lib": ["es2015", "dom"],
    "moduleResolution": "node",
    "noImplicitAny": false,
    "removeComments": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "strictPropertyInitialization": false,
    "target": "es5"
  }
}
```

#### API 应用配置

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "strictNullChecks": true,
    "target": "es6"
  }
}
```

#### Dashboard 应用配置（Project References）

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 5.2 代码规范工具

```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": ["**"],
    "ignoreUnknown": false
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "@novu/*/**/*": "Please import only from the root package entry point"
            }
          }
        }
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": { "organizeImports": "on" }
    }
  }
}
```

**自定义 Biome 插件**：
- `pino-logger-arg-order.grit` - Pino 日志参数顺序检查
- `api-property-record-type.grit` - API Property 类型检查
- `command-session-exclusion.grit` - 命令会话排除检查

### 5.3 环境变量管理

**API 环境文件**（`apps/api/src/`）：
- `.env.development` - 开发环境
- `.env.production` - 生产环境
- `.env.test` - 测试环境
- `.example.env` - 环境变量模板

**Docker 本地环境**（`docker/local/docker-compose.yml`）：
```yaml
services:
  localstack:    # AWS S3 模拟
  mongo:         # MongoDB 8.0
  redis:         # Redis
  clickhouse:    # ClickHouse 24.3
```

---

## 六、CI/CD 工作流

### 6.1 GitHub Actions 工作流

| 工作流文件 | 用途 |
|:---|:---|
| `on-pr.yml` | PR 检查 |
| `deploy.yml` | 部署流程 |
| `release-packages.yml` | NPM 包发布 |
| `preview-packages.yml` | 预览包发布 |
| `reusable-*-e2e.yml` | E2E 测试复用 |
| `dev-deploy-*.yml` | 开发环境部署 |
| `check-submodule-sync-*.yaml` | 子模块同步检查 |

### 6.2 本地开发脚本

| 脚本 | 功能 |
|:---|:---|
| `jarvis.js` | 交互式开发助手 |
| `setup-env-files.js` | 环境变量配置 |
| `get-affected-array.mjs` | 获取受影响项目 |
| `pnpm-context.mjs` | Docker 构建上下文 |
| `symlink-ee.mjs` | 企业版符号链接 |

---

## 七、架构模式总结

### 7.1 核心架构模式

| 模式 | 应用场景 |
|:---|:---|
| **CQRS** | 命令/查询分离 |
| **事件驱动** | BullMQ 消息队列 |
| **微服务** | 独立部署的 Apps |
| **插件系统** | Providers 适配器 |
| **多租户** | 组织/环境隔离 |
| **特性开关** | 企业版功能控制 |

### 7.2 关键设计决策

1. **Monorepo 统一管理**：Nx + pnpm workspaces
2. **依赖图感知构建**：`dependsOn: ["^build"]`
3. **企业版隔离**：Git Submodule + 可选依赖
4. **双模块格式**：ESM + CJS 同时支持
5. **Nx Cloud 分布式缓存**：加速 CI 构建
6. **Biome 替代 ESLint**：更快的 Lint 工具

---

## 八、参考命令

```bash
# 完整项目设置
pnpm setup:project

# 交互式开发助手
pnpm start

# 构建核心服务
pnpm build:v2

# 构建所有包
pnpm build:packages

# 运行测试
pnpm test

# 代码检查
pnpm lint
pnpm check:fix

# Docker 本地环境
docker-compose -f docker/local/docker-compose.yml up -d
```

---

**报告生成时间**：2026-02-22  
**项目版本**：3.13.x
