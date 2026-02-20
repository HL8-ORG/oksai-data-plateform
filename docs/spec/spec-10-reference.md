# 快速参考表

[返回目录](./spec.md) | [上一章：高级规范](./spec-09-advanced.md)

---

## 一、文件命名快速参考

### 1.1 领域层

| 组件 | 文件命名 | 类命名 |
|:---|:---|:---|
| 聚合根 | `job.aggregate.ts` | `Job` |
| 实体 | `job-item.entity.ts` | `JobItem` |
| 值对象 | `job-id.vo.ts` | `JobId` |
| 领域事件 | `job-created.domain-event.ts` | `JobCreatedEvent` |
| 仓储接口 | `job.repository.ts` | `IJobRepository` |
| 驱动端口 | `job-command.port.ts` | `IJobCommandPort` |
| 被驱动端口 | `event-store.port.ts` | `IEventStorePort` |
| 领域服务 | `job-priority.domain-service.ts` | `JobPriorityService` |
| 业务规则 | `job-must-have-title.rule.ts` | `JobMustHaveTitleRule` |
| 规格模式 | `active-job.specification.ts` | `ActiveJobSpecification` |
| 领域异常 | `job-domain.exception.ts` | `JobDomainException` |

### 1.2 应用层

| 组件 | 文件命名 | 类命名 |
|:---|:---|:---|
| 命令 | `create-job.command.ts` | `CreateJobCommand` |
| 命令处理器 | `create-job.handler.ts` | `CreateJobHandler` |
| 查询 | `get-job.query.ts` | `GetJobQuery` |
| 查询处理器 | `get-job.handler.ts` | `GetJobQueryHandler` |
| DTO | `job.dto.ts` | `JobDto` |
| 请求 DTO | `create-job-request.dto.ts` | `CreateJobRequestDto` |
| 应用服务 | `job.application-service.ts` | `JobApplicationService` |

### 1.3 基础设施层

| 组件 | 文件命名 | 类命名 |
|:---|:---|:---|
| 仓储实现 | `event-sourced-job.repository.ts` | `EventSourcedJobRepository` |
| 读仓储 | `clickhouse-job-read.repository.ts` | `ClickHouseJobReadRepository` |
| 适配器 | `postgres-event-store.adapter.ts` | `PostgresEventStoreAdapter` |
| 投影器 | `job.projector.ts` | `JobProjector` |
| 消费者 | `job-event.consumer.ts` | `JobEventConsumer` |
| 映射器 | `job.mapper.ts` | `JobMapper` |

### 1.4 表现层

| 组件 | 文件命名 | 类命名 |
|:---|:---|:---|
| 控制器 | `job.controller.ts` | `JobController` |
| 解析器 | `job.resolver.ts` | `JobResolver` |
| 中间件 | `tenant.middleware.ts` | `TenantMiddleware` |
| 守卫 | `roles.guard.ts` | `RolesGuard` |
| 拦截器 | `logging.interceptor.ts` | `LoggingInterceptor` |

### 1.5 测试

| 类型 | 文件命名 |
|:---|:---|
| 单元测试 | `job.aggregate.spec.ts` |
| 集成测试 | `event-sourced-job.repository.int-spec.ts` |
| E2E 测试 | `job-flow.e2e-spec.ts` |
| 夹具 | `job.fixture.ts` |
| Mock | `job.repository.mock.ts` |

---

## 二、类命名快速参考

### 2.1 领域层

| 组件 | 命名模式 | 示例 |
|:---|:---|:---|
| 聚合根 | PascalCase（无后缀） | `Job` |
| 实体 | PascalCase（无后缀） | `JobItem` |
| 值对象 | PascalCase（无后缀） | `JobId`, `JobTitle` |
| 领域事件 | `[Entity][PastTense]Event` | `JobCreatedEvent` |
| 仓储接口 | `I[Entity]Repository` | `IJobRepository` |
| 领域服务 | `[Concept][Action]Service` | `JobPriorityService` |
| 规格模式 | `[Concept][Condition]Specification` | `ActiveJobSpecification` |
| 业务规则 | `[Concept][Condition]Rule` | `JobMustHaveTitleRule` |
| 领域异常 | `[Domain]DomainException` | `JobDomainException` |

### 2.2 应用层

| 组件 | 命名模式 | 示例 |
|:---|:---|:---|
| 命令 | `[Action][Target]Command` | `CreateJobCommand` |
| 命令处理器 | `[Action][Target]Handler` | `CreateJobHandler` |
| 查询 | `[Action][Target]Query` | `GetJobQuery` |
| 查询处理器 | `[QueryName]QueryHandler` | `GetJobQueryHandler` |
| DTO | `[Concept][Purpose]Dto` | `JobSummaryDto` |
| 端口 | `I[Entity][Type]Port` | `IJobCommandPort` |

### 2.3 基础设施层

| 组件 | 命名模式 | 示例 |
|:---|:---|:---|
| 仓储实现 | `[ImplType][Entity]Repository` | `EventSourcedJobRepository` |
| 读仓储 | `[Tech][Entity]ReadRepository` | `ClickHouseJobReadRepository` |
| 适配器 | `[Tech/Provider][Function]Adapter` | `PostgresEventStoreAdapter` |
| 投影器 | `[Entity]Projector` | `JobProjector` |
| 消费者 | `[Domain]EventConsumer` | `JobEventConsumer` |
| 映射器 | `[Entity]Mapper` | `JobMapper` |

---

## 三、变量命名快速参考

### 3.1 布尔变量

| 前缀 | 用途 | 示例 |
|:---|:---|:---|
| `is` | 状态判断 | `isActive`, `isDeleted` |
| `has` | 拥有判断 | `hasPermission`, `hasItems` |
| `can` | 能力判断 | `canEdit`, `canDelete` |
| `should` | 行为判断 | `shouldNotify`, `shouldRetry` |

### 3.2 数字变量

| 后缀 | 用途 | 示例 |
|:---|:---|:---|
| `Count` | 计数 | `totalCount`, `itemCount` |
| `Index` | 索引 | `pageIndex`, `currentIndex` |
| `Size` | 大小 | `pageSize`, `fileSize` |
| `Ms` | 毫秒 | `timeoutMs`, `durationMs` |

### 3.3 集合变量

| 类型 | 命名 | 示例 |
|:---|:---|:---|
| 数组 | 复数形式 | `jobs`, `items` |
| Map | `XxxMap` | `jobByIdMap` |
| Set | `XxxSet` | `uniqueIdsSet` |

---

## 四、代码检查清单

### 4.1 文件命名

- [ ] 所有文件使用 `kebab-case`
- [ ] 类型后缀正确（`.aggregate.ts`, `.vo.ts`, `.command.ts` 等）
- [ ] 测试文件与被测文件同名 + `.spec.ts`

### 4.2 类命名

- [ ] 聚合根/实体无后缀
- [ ] 接口使用 `I` 前缀
- [ ] DTO 使用 `Dto` 后缀（驼峰式）
- [ ] 事件使用过去式动词

### 4.3 变量命名

- [ ] 布尔变量使用 `is/has/can/should` 前缀
- [ ] 常量使用 `UPPER_SNAKE_CASE`
- [ ] 集合变量使用复数形式
- [ ] 无缩写（除非通用）

---

## 五、修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v2.0 | 2026-02-20 | 全面重构：统一 kebab-case + 类型后缀命名 |
| v1.0 | - | 初始版本 |

---

[返回目录](./spec.md)
