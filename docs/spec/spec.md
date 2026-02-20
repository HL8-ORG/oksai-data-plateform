# 编码规范

本项目基于 **DDD + Hexagonal + CQRS + EDA + Event Sourcing** 架构，本规范涵盖文件命名、类命名、变量命名、目录结构等各方面。

---

## 核心原则

| 原则 | 说明 |
|:---|:---|
| **意图清晰** | 名称必须表达其职责和角色 |
| **一致性** | 同一层级的同类组件使用相同命名模式 |
| **语境化** | 名称在所属上下文中有意义 |
| **无缩写** | 除非通用缩写（DTO, UUID, HTTP） |
| **遵循社区惯例** | 采用 TypeScript/NestJS 社区约定 |

---

## 文档索引

| 文档 | 内容 |
|:---|:---|
| [spec-01-overview.md](./spec-01-overview.md) | 核心原则、文件命名规范 |
| [spec-02-domain.md](./spec-02-domain.md) | 领域层命名规范 |
| [spec-03-application.md](./spec-03-application.md) | 应用层命名规范 |
| [spec-04-infrastructure.md](./spec-04-infrastructure.md) | 基础设施层命名规范 |
| [spec-05-interface.md](./spec-05-interface.md) | 接口层命名规范 |
| [spec-06-shared.md](./spec-06-shared.md) | 共享模块命名规范 |
| [spec-07-testing.md](./spec-07-testing.md) | 测试文件命名规范 |
| [spec-08-variables.md](./spec-08-variables.md) | 变量命名规范 |
| [spec-09-advanced.md](./spec-09-advanced.md) | 高级规范（多租户、CQRS） |
| [spec-10-reference.md](./spec-10-reference.md) | 快速参考表 |

---

## 快速参考

### 文件命名规范（kebab-case + 类型后缀）

```
# 领域模型
job.aggregate.ts
job-item.entity.ts
job-id.vo.ts
job-title.vo.ts

# 领域事件
job-created.domain-event.ts
job-started.domain-event.ts

# 应用层
create-job.command.ts
create-job.handler.ts
get-job.query.ts
get-job.handler.ts
job.dto.ts

# 基础设施层
event-sourced-job.repository.ts
clickhouse-job-read.repository.ts
postgres-event-store.adapter.ts
job.projector.ts

# 端口
job.repository.ts              # 接口
job-command.port.ts            # 驱动端口
event-store.port.ts            # 被驱动端口
```

### 类命名规范

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

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v2.0 | 2026-02-20 | 全面重构：统一 kebab-case + 类型后缀命名规范 |
| v1.0 | - | 初始版本 |
