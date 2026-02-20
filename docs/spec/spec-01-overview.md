# 核心原则与文件命名规范

[返回目录](./spec.md)

---

## 一、核心原则

| 原则 | 说明 |
|:---|:---|
| **意图清晰** | 名称必须表达其职责和角色 |
| **一致性** | 同一层级的同类组件使用相同命名模式 |
| **语境化** | 名称在所属上下文中有意义 |
| **无缩写** | 除非通用缩写（DTO, UUID, HTTP） |
| **类型后缀** | 使用后缀标识组件类型 |

---

## 二、目录命名

所有目录使用 `kebab-case`：

```
domain/
├── model/
├── events/
├── services/
├── rules/
├── specifications/
├── repositories/
├── ports/
│   ├── primary/
│   └── secondary/
└── exceptions/

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

## 三、文件命名规范

### 3.1 领域层文件

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 聚合根 | `[name].aggregate.ts` | `job.aggregate.ts` |
| 实体 | `[name].entity.ts` | `job-item.entity.ts` |
| 值对象 | `[name].vo.ts` | `job-id.vo.ts`, `job-title.vo.ts` |
| 领域事件 | `[name].domain-event.ts` | `job-created.domain-event.ts` |
| 领域服务 | `[name].domain-service.ts` | `job-priority.domain-service.ts` |
| 业务规则 | `[name].rule.ts` | `job-must-have-title.rule.ts` |
| 规格模式 | `[name].specification.ts` | `active-job.specification.ts` |
| 仓储接口 | `[name].repository.ts` | `job.repository.ts` |
| 领域异常 | `[name].exception.ts` | `job-domain.exception.ts` |

### 3.2 端口文件

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 驱动端口 | `[name].port.ts` | `job-command.port.ts`, `job-query.port.ts` |
| 被驱动端口 | `[name].port.ts` | `event-store.port.ts`, `notification.port.ts` |

### 3.3 应用层文件

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 命令 | `[action]-[target].command.ts` | `create-job.command.ts` |
| 命令处理器 | `[action]-[target].handler.ts` | `create-job.handler.ts` |
| 查询 | `[action]-[target].query.ts` | `get-job.query.ts`, `list-jobs.query.ts` |
| 查询处理器 | `[query-name].handler.ts` | `get-job.handler.ts` |
| 应用服务 | `[name].application-service.ts` | `job.application-service.ts` |
| DTO | `[name].dto.ts` | `job.dto.ts`, `create-job-request.dto.ts` |

### 3.4 基础设施层文件

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 仓储实现 | `[impl-type]-[name].repository.ts` | `event-sourced-job.repository.ts` |
| 读仓储 | `[tech]-[name]-read.repository.ts` | `clickhouse-job-read.repository.ts` |
| 适配器 | `[tech]-[name].adapter.ts` | `postgres-event-store.adapter.ts` |
| 投影器 | `[name].projector.ts` | `job.projector.ts` |
| 消费者 | `[name].consumer.ts` | `job-event.consumer.ts` |
| 映射器 | `[name].mapper.ts` | `job.mapper.ts` |

### 3.5 表现层文件

| 组件类型 | 规范 | 示例 |
|:---|:---|:---|
| 控制器 | `[name].controller.ts` | `job.controller.ts` |
| 解析器 | `[name].resolver.ts` | `job.resolver.ts` |
| 中间件 | `[name].middleware.ts` | `tenant.middleware.ts` |
| 守卫 | `[name].guard.ts` | `roles.guard.ts` |
| 拦截器 | `[name].interceptor.ts` | `logging.interceptor.ts` |
| 管道 | `[name].pipe.ts` | `validation.pipe.ts` |

### 3.6 测试文件

| 测试类型 | 规范 | 示例 |
|:---|:---|:---|
| 单元测试 | `[file-name].spec.ts` | `job.aggregate.spec.ts` |
| 集成测试 | `[file-name].int-spec.ts` | `event-sourced-job.repository.int-spec.ts` |
| E2E测试 | `[scenario].e2e-spec.ts` | `job-flow.e2e-spec.ts` |
| 测试夹具 | `[name].fixture.ts` | `job.fixture.ts` |
| Mock | `[name].mock.ts` | `job.repository.mock.ts` |

---

## 四、文件命名示例

```typescript
// ✅ 正确 - 领域层
domain/model/job.aggregate.ts
domain/model/job-id.vo.ts
domain/events/job-created.domain-event.ts
domain/repositories/job.repository.ts
domain/ports/primary/job-command.port.ts
domain/ports/secondary/event-store.port.ts

// ✅ 正确 - 应用层
application/commands/create-job.command.ts
application/commands/handlers/create-job.handler.ts
application/queries/get-job.query.ts
application/queries/handlers/get-job.handler.ts
application/dto/job.dto.ts

// ✅ 正确 - 基础设施层
infrastructure/persistence/event-sourced-job.repository.ts
infrastructure/adapters/secondary/postgres-event-store.adapter.ts
infrastructure/projections/job.projector.ts

// ❌ 错误 - 不一致的命名
domain/model/Job.ts                    // 缺少类型后缀
domain/model/JobId.ts                  // 缺少类型后缀
domain/events/JobCreated.ts            // 缺少类型后缀
application/commands/CreateJob.ts      // 缺少类型后缀
infrastructure/persistence/JobRepo.ts  // 使用缩写
```

---

## 五、导入语句规范

```typescript
// 1. Node.js 内置模块
import { AsyncLocalStorage } from 'async_hooks';
import path from 'path';

// 2. 第三方库
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

// 3. Monorepo 包（@oksai/ 前缀）
import { AggregateRoot } from '@oksai/shared/kernel';
import { Command } from '@oksai/shared/cqrs';

// 4. 相对路径
import { JobCreatedEvent } from '../events/job-created.domain-event';
import { JobId } from './job-id.vo';

// 5. 类型导入
import type { JobEvent } from './job.aggregate';
```

---

[下一章：领域层命名规范 →](./spec-02-domain.md)
