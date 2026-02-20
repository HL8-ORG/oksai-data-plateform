---
description: oksai-data-plateform 项目宪章
globs:
alwaysApply: true
---

# oksai-data-plateform 项目宪章

本文档为在此代码库中工作的 AI 代理提供完整的项目指南。

---

## 一、项目简介

### 1.1 项目定位

**本项目基于 `/home/arligle/oksai-saas/oksai-saas-api-archi/` 项目的重构**，构建企业级多租户 SaaS 数据分析平台。

### 1.2 四大核心目标

| 核心目标 | 关键技术 | 预期价值 |
|:---|:---|:---|
| **数据分析平台** | 事件溯源 + 投影 + ClickHouse | 实时分析、历史回放、多维度统计 |
| **外部数据接口** | Hexagonal Ports + 多种 Adapters | 统一接入、可插拔、健康监控 |
| **异构系统数据仓库** | Delta Lake + Schema Evolution | ACID 事务、Schema 演进、时间旅行 |
| **AI 能力嵌入** | 向量数据库 + AI 推理服务 | 智能分析、相似性搜索、自动化决策 |

### 1.3 架构选择

**DDD + Hexagonal Architecture + CQRS + Event Sourcing + EDA**

| 架构模式 | 解决的问题 | 对应目标 |
|:---|:---|:---|
| **DDD** | 复杂业务领域建模 | 所有目标 |
| **Hexagonal** | 业务核心与技术解耦 | 外部数据接入、AI 嵌入 |
| **CQRS** | 读写分离，分析查询优化 | 数据分析 |
| **Event Sourcing** | 完整审计，时间旅行 | 数据分析、数据仓库 |
| **EDA** | 松耦合跨域通信 | 所有目标 |

### 1.4 架构特点

- **领域纯净**：领域层无外部依赖，可独立测试
- **六边形边界**：Primary/Secondary Port 清晰分离
- **CQRS 分离**：命令侧事件溯源，查询侧 ClickHouse
- **事件驱动**：模块间通过领域事件/集成事件通信
- **多租户隔离**：全链路租户上下文，行级数据隔离
- **Monorepo 统一**：pnpm workspace + Turborepo 统一管理

---

## 二、核心原则

### 2.1 中文优先原则

- 所有代码注释、技术文档、错误消息、日志输出及用户界面文案**必须使用中文**
- Git 提交信息**必须使用英文描述**
- 代码变量命名**保持英文**，但必须配有中文注释说明业务语义

| 内容类型 | 语言要求 |
|:---|:---|
| 代码注释 | **必须使用中文** |
| 技术文档 | **必须使用中文** |
| 错误消息 | **必须使用中文** |
| 日志输出 | **必须使用中文** |
| 用户界面文案 | **必须使用中文** |
| Git 提交信息 | **必须使用英文** |
| 代码变量命名 | **保持英文**，但必须配有中文注释说明业务语义 |

**理由**：统一中文语境提升团队沟通效率，确保业务认知一致，降低知识传递成本。

### 2.2 代码即文档原则

- 公共 API、类、方法、接口、枚举**必须编写完整 TSDoc 注释**
- TSDoc 必须覆盖：功能描述、业务规则、使用场景、前置条件、后置条件、异常抛出及注意事项
- 代码变更时**必须同步更新注释**，保持实现与文档一致

**理由**：通过高质量注释让代码自身成为权威业务文档，缩短交接时间并减少额外文档维护负担。

### 2.3 命名核心原则

| 原则 | 说明 |
|:---|:---|
| **意图清晰** | 名称必须表达其职责和角色 |
| **一致性** | 同一层级的同类组件使用相同命名模式 |
| **语境化** | 名称在所属上下文中有意义 |
| **无缩写** | 除非通用缩写（DTO, UUID, HTTP） |
| **类型后缀** | 使用后缀标识组件类型 |

---

## 三、技术栈约束

### 3.1 项目技术栈约束原则

- 全仓统一采用 Node.js + TypeScript
- 使用 pnpm 管理依赖并通过 monorepo 组织代码
- 模块系统与 TypeScript 配置策略（必读）：`.cursor/docs/XS-模块系统与TypeScript配置策略.md`
    - 默认以 **CommonJS（CJS）语义**运行服务端产物（当前各包未声明 `"type": "module"`）
    - 根 `tsconfig.base.json` 采用 `module/moduleResolution: nodenext`，用于更贴近 Node 的依赖解析（`package.json#exports`/条件导出）
    - 构建阶段（如 `nest build`）在 app 的 `tsconfig.build.json` 采用 `module/moduleResolution: node16`，确保编译与解析组合合法且稳定
    - `*.tsbuildinfo` 属于增量缓存，必须忽略，不得提交
- pnpm 配置（`.npmrc`）：
    - `shamefully-hoist=false` — 禁止将依赖提升到根 node_modules，保持严格的嵌套结构，防止"幽灵依赖"
    - `strict-peer-dependencies=false` — 关闭 peer dependencies 严格检查，未满足时仅警告而不中断安装
    - `auto-install-peers=true` — 自动安装 peer dependencies，无需手动逐个添加

### 3.2 运行时与包管理

- **运行时**：Node.js 20+
- **语言**：TypeScript
- **包管理**：pnpm（monorepo 组织）
- **构建**：Turborepo

### 3.3 Monorepo 包命名

所有包使用 `@oksai/` 前缀：

```
@oksai/kernel
@oksai/event-store
@oksai/cqrs
@oksai/tenant
@oksai/identity
@oksai/app-kit
@oksai/app/platform-api
```

---

## 四、文档体系

### 4.1 架构文档（`docs/archi/`）

| 文档 | 内容 |
|:---|:---|
| [archi.md](./docs/archi/archi.md) | 架构总览、分层职责、数据流 |
| [archi-01-structure.md](./docs/archi/archi-01-structure.md) | 项目结构与 Monorepo 组织 |
| [archi-02-domain.md](./docs/archi/archi-02-domain.md) | 领域层 - 聚合根、实体、值对象、Port |
| [archi-03-event-store.md](./docs/archi/archi-03-event-store.md) | 事件存储与事件溯源实现 |
| [archi-04-read-model.md](./docs/archi/archi-04-read-model.md) | 查询侧 - ClickHouse 读模型 |
| [archi-05-projection.md](./docs/archi/archi-05-projection.md) | 投影（事件溯源 → 读模型） |
| [archi-06-multi-tenant.md](./docs/archi/archi-06-multi-tenant.md) | 多租户实现 |
| [archi-07-command-handler.md](./docs/archi/archi-07-command-handler.md) | 命令处理器与 CQRS |
| [archi-08-consumer.md](./docs/archi/archi-08-consumer.md) | 事件消费者与 Inbox 模式 |
| [archi-09-clickhouse.md](./docs/archi/archi-09-clickhouse.md) | ClickHouse 表结构设计 |
| [archi-10-deployment.md](./docs/archi/archi-10-deployment.md) | 部署架构 |
| [archi-11-plugin-platform.md](./docs/archi/archi-11-plugin-platform.md) | 插件系统与平台装配架构 |

### 4.2 编码规范（`docs/spec/`）

| 文档 | 内容 |
|:---|:---|
| [spec.md](./docs/spec/spec.md) | 规范总览、快速参考 |
| [spec-01-overview.md](./docs/spec/spec-01-overview.md) | 核心原则、文件命名规范 |
| [spec-02-domain.md](./docs/spec/spec-02-domain.md) | 领域层命名规范 |
| [spec-03-application.md](./docs/spec/spec-03-application.md) | 应用层命名规范 |
| [spec-04-infrastructure.md](./docs/spec/spec-04-infrastructure.md) | 基础设施层命名规范 |
| [spec-05-interface.md](./docs/spec/spec-05-interface.md) | 接口层命名规范 |
| [spec-06-shared.md](./docs/spec/spec-06-shared.md) | 共享模块命名规范 |
| [spec-07-testing.md](./docs/spec/spec-07-testing.md) | 测试文件命名规范 |
| [spec-08-variables.md](./docs/spec/spec-08-variables.md) | 变量命名规范 |
| [spec-09-advanced.md](./docs/spec/spec-09-advanced.md) | 高级规范（多租户、CQRS） |
| [spec-10-reference.md](./docs/spec/spec-10-reference.md) | 快速参考表 |

### 4.3 测试指南（`docs/testing/`）

| 文档 | 内容 |
|:---|:---|
| [README.md](./docs/testing/README.md) | 测试指南总览、测试金字塔 |
| [01-testing-overview.md](./docs/testing/01-testing-overview.md) | 测试概述 |
| [02-unit-testing.md](./docs/testing/02-unit-testing.md) | 单元测试 |
| [03-bdd-testing.md](./docs/testing/03-bdd-testing.md) | BDD 测试 |
| [04-tdd-methodology.md](./docs/testing/04-tdd-methodology.md) | TDD 方法论 |
| [05-testing-in-ddd.md](./docs/testing/05-testing-in-ddd.md) | DDD 架构中的测试 |
| [06-testing-naming.md](./docs/testing/06-testing-naming.md) | 测试命名规范 |
| [07-mocking-guide.md](./docs/testing/07-mocking-guide.md) | Mock 与 Stub 指南 |
| [08-integration-testing.md](./docs/testing/08-integration-testing.md) | 集成测试 |
| [09-e2e-testing.md](./docs/testing/09-e2e-testing.md) | 端到端测试 |
| [10-ci-cd-integration.md](./docs/testing/10-ci-cd-integration.md) | CI/CD 集成 |
| [11-development-workflow.md](./docs/testing/11-development-workflow.md) | 开发工作流程 |

---

## 五、文件命名规范

### 5.1 命名模式

**所有文件使用 `kebab-case` + 类型后缀**

### 5.2 领域层

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 聚合根 | `[name].aggregate.ts` | `job.aggregate.ts` |
| 实体 | `[name].entity.ts` | `job-item.entity.ts` |
| 值对象 | `[name].vo.ts` | `job-id.vo.ts` |
| 领域事件 | `[name].domain-event.ts` | `job-created.domain-event.ts` |
| 领域服务 | `[name].domain-service.ts` | `job-priority.domain-service.ts` |
| 业务规则 | `[name].rule.ts` | `job-must-have-title.rule.ts` |
| 仓储接口 | `[name].repository.ts` | `job.repository.ts` |
| 端口 | `[name].port.ts` | `job-command.port.ts` |

### 5.3 应用层

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 命令 | `[action]-[target].command.ts` | `create-job.command.ts` |
| 命令处理器 | `[action]-[target].handler.ts` | `create-job.handler.ts` |
| 查询 | `[action]-[target].query.ts` | `get-job.query.ts` |
| 查询处理器 | `[query-name].handler.ts` | `get-job.handler.ts` |
| DTO | `[name].dto.ts` | `job.dto.ts` |

### 5.4 基础设施层

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 仓储实现 | `[impl-type]-[name].repository.ts` | `event-sourced-job.repository.ts` |
| 读仓储 | `[tech]-[name]-read.repository.ts` | `clickhouse-job-read.repository.ts` |
| 适配器 | `[tech]-[name].adapter.ts` | `postgres-event-store.adapter.ts` |
| 投影器 | `[name].projector.ts` | `job.projector.ts` |
| 消费者 | `[name].consumer.ts` | `job-event.consumer.ts` |

### 5.5 测试文件

| 测试类型 | 规范 | 示例 |
|:---|:---|:---|
| 单元测试 | `[file-name].spec.ts` | `job.aggregate.spec.ts` |
| 集成测试 | `[file-name].int-spec.ts` | `event-sourced-job.repository.int-spec.ts` |
| E2E测试 | `[scenario].e2e-spec.ts` | `job-flow.e2e-spec.ts` |
| 测试夹具 | `[name].fixture.ts` | `job.fixture.ts` |
| Mock | `[name].mock.ts` | `job.repository.mock.ts` |

---

## 六、目录结构

```
domain/
├── model/           # 聚合根、实体、值对象
├── events/          # 领域事件
├── services/        # 领域服务
├── rules/           # 业务规则
├── specifications/  # 规格模式
├── repositories/    # 仓储接口
├── ports/
│   ├── primary/     # 驱动端口
│   └── secondary/   # 被驱动端口
└── exceptions/      # 领域异常

application/
├── commands/
│   └── handlers/
├── queries/
│   └── handlers/
├── services/
└── dto/

infrastructure/
├── persistence/
│   └── mappers/
├── adapters/
│   ├── primary/
│   └── secondary/
├── projections/
└── consumers/

presentation/
└── nest/
    ├── controllers/
    ├── resolvers/
    ├── dto/
    └── guards/
```

---

## 七、开发工作流程

### 7.1 标准流程

```
用户故事 → BDD 场景 → TDD 循环 → 代码实现
    ↓           ↓           ↓           ↓
 业务需求    验收标准    单元测试    生产代码
```

### 7.2 TDD 循环

```
🔴 Red  →  编写失败的测试
🟢 Green →  用最简单的方式让测试通过
🔵 Refactor →  优化代码，保持测试通过
```

### 7.3 示例模块

**统一使用 `job` 作为示例模块**（不是 `order`）

---

## 八、测试策略

### 8.1 测试金字塔

```
              ┌─────────────┐
              │   E2E 测试   │  10% - 关键业务流程
              │   (慢、少)   │
          ┌───┴─────────────┴───┐
          │     集成测试         │  20% - 组件交互
          │    (较慢、适中)      │
      ┌───┴─────────────────────┴───┐
      │         单元测试             │  70% - 业务逻辑
      │       (快、大量)             │
      └─────────────────────────────┘
```

### 8.2 覆盖率要求

| 层级 | 最低覆盖率 |
|:---|:---|
| 全局 | 80% |
| 领域层 | 90% |
| 应用层 | 85% |

### 8.3 常用命令

```bash
# 运行单元测试
pnpm run test:unit

# 运行集成测试
pnpm run test:integration

# 运行 BDD 测试
pnpm run test:bdd

# 运行 E2E 测试
pnpm run test:e2e

# 运行所有测试
pnpm run test:all

# 测试覆盖率
pnpm run test:coverage

# 监听模式
pnpm run test:watch
```

---

## 九、类命名规范

| 组件 | 规范 | 示例 |
|:---|:---|:---|
| 聚合根 | PascalCase | `Job` |
| 值对象 | PascalCase | `JobId`, `JobTitle` |
| 领域事件 | `[实体][过去式]Event` | `JobCreatedEvent` |
| 仓储接口 | `I[实体]Repository` | `IJobRepository` |
| 命令 | `[动作][目标]Command` | `CreateJobCommand` |
| 查询 | `[动作][目标]Query` | `GetJobQuery` |
| DTO | `[概念][用途]Dto` | `JobSummaryDto` |
| Port | `I[用途]Port` | `IJobCommandPort` |
| 异常 | `[领域][类型]Exception` | `JobDomainException` |

---

## 十、导入语句顺序

```typescript
// 1. Node.js 内置模块
import { AsyncLocalStorage } from 'async_hooks';

// 2. 第三方库
import { Injectable } from '@nestjs/common';

// 3. Monorepo 包（@oksai/ 前缀）
import { AggregateRoot } from '@oksai/kernel';
import { Command } from '@oksai/cqrs';

// 4. 相对路径
import { JobCreatedEvent } from '../events/job-created.domain-event';
import { JobId } from './job-id.vo';

// 5. 类型导入
import type { JobEvent } from './job.aggregate';
```

---

## 十一、检查清单

### 11.1 提交前检查

- [ ] 代码注释使用中文
- [ ] 文件命名符合 `kebab-case` + 类型后缀
- [ ] 领域层无外部依赖
- [ ] 单元测试通过
- [ ] 测试覆盖率达标
- [ ] TSDoc 注释完整
- [ ] Git 提交信息使用英文

### 11.2 PR 检查

- [ ] Lint 检查通过
- [ ] 类型检查通过
- [ ] 所有测试通过
- [ ] 代码覆盖率未降低
- [ ] 文档已更新

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v3.0 | 2026-02-20 | 全面重构：整合架构文档、编码规范、测试指南 |
| v2.0 | 2026-02-20 | 统一命名规范为 kebab-case + 类型后缀 |
| v1.0 | - | 初始版本 |
