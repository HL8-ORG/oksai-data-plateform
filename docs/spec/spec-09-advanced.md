# 多租户/事件溯源/CQRS 高级命名规范

[返回目录](./spec.md) | [上一章：变量命名](./spec-08-variables.md)

---

## 一、多租户相关命名

### 1.1 租户标识

```typescript
// ✅ 正确 - 租户标识变量
const tenantId: string;
const currentTenant: Tenant;
const tenantContext: ITenantContext;

// 中间件注入
req.tenantId;
req.tenantContext;

// 仓储方法
jobRepository.findByTenant(tenantId);
jobRepository.findByTenantAndId(tenantId, jobId);
```

### 1.2 租户作用域服务

```typescript
// ✅ 正确 - 租户作用域命名
// 文件名: tenant-scoped-job.service.ts
export class TenantScopedJobService { }

// 文件名: tenant-context.service.ts
export class TenantContextService { }

// 工厂函数
export const createTenantScopedHandler = (tenantId: string) => { };
export const withTenant = <T>(tenantId: string, fn: () => T) => { };
```

### 1.3 多租户中间件

```typescript
// ✅ 正确 - 文件名: tenant.middleware.ts
/**
 * 多租户中间件
 * 
 * @business-rule 从请求中提取租户标识
 * @business-rule 验证租户有效性
 * @business-rule 注入租户上下文到请求
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly logger: ILogger
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = this.extractTenantId(req);

    if (!tenantId) {
      throw new BadRequestException('缺少租户标识');
    }

    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant?.isActive) {
      throw new ForbiddenException('无效或已停用的租户');
    }

    // 注入租户上下文
    req.tenantId = tenantId;
    req.tenant = tenant;

    next();
  }
}
```

### 1.4 租户隔离仓储

```typescript
// ✅ 正确 - 带租户隔离的仓储实现
// 文件名: postgres-job.repository.ts
@injectable()
export class PostgresJobRepository implements IJobRepository {
  async findByIdAndTenant(id: string, tenantId: string): Promise<Job | null> {
    const { rows } = await this.pool.query(
      'SELECT data FROM jobs WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return rows[0] ? this.jobMapper.toDomain(rows[0].data) : null;
  }

  async findByTenant(tenantId: string, criteria: JobCriteria): Promise<Job[]> {
    // 租户隔离查询
  }
}
```

---

## 二、事件溯源（Event Sourcing）相关命名

### 2.1 事件流相关

```typescript
// ✅ 正确 - 事件流标识
const streamId: string = 'job-123';
const aggregateId: string = 'job-123';
const expectedVersion: number = 5;
const currentVersion: number = 5;
const fromVersion: number = 0;

// 事件存储方法
eventStore.appendToStream(streamId, events, expectedVersion);
eventStore.loadEvents(streamId, fromVersion);
eventStore.getStreamVersion(streamId);
```

### 2.2 聚合根事件方法

```typescript
// ✅ 正确 - 文件名: aggregate-root.base.ts
/**
 * 聚合根基类
 */
export abstract class AggregateRoot<TEvent extends DomainEvent = DomainEvent> {
  protected _domainEvents: TEvent[] = [];

  /**
   * 应用变更（内部方法）
   */
  protected applyChange(event: TEvent): void { }

  /**
   * 获取未提交的领域事件
   */
  getUncommittedEvents(): TEvent[] { }

  /**
   * 清除已提交的领域事件
   */
  clearUncommittedEvents(): void { }

  /**
   * 从事件流重建聚合
   */
  static rehydrate(events: TEvent[]): AggregateRoot { }

  /**
   * 应用事件（子类实现）
   */
  protected abstract apply(event: TEvent): void;
}
```

### 2.3 事件版本控制

```typescript
// ✅ 正确 - 文件名: job-created.domain-event.ts
/**
 * 任务已创建事件 V1
 */
export class JobCreatedEventV1 extends DomainEvent<JobCreatedPayloadV1> {
  readonly eventType = 'JobCreated';
  readonly version = 1;  // 事件 schema 版本
}

/**
 * 任务已创建事件 V2（新增字段）
 */
export class JobCreatedEventV2 extends DomainEvent<JobCreatedPayloadV2> {
  readonly eventType = 'JobCreated';
  readonly version = 2;
}

// 文件名: job-created-v1-to-v2.upgrader.ts
/**
 * 事件升级器：V1 -> V2
 */
export class JobCreatedV1ToV2Upgrader {
  upgrade(event: JobCreatedEventV1): JobCreatedEventV2 {
    return new JobCreatedEventV2({
      ...event.data,
      currency: 'CNY'  // 新增字段默认值
    });
  }
}
```

### 2.4 快照（Snapshot）

```typescript
// ✅ 正确 - 文件名: snapshot.interface.ts
/**
 * 快照接口
 */
export interface ISnapshot<TState> {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: TState;
  timestamp: Date;
  tenantId: string;
}

// 文件名: job-snapshot.vo.ts
/**
 * 任务快照
 */
export class JobSnapshot implements ISnapshot<JobState> {
  constructor(
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly state: JobState,
    public readonly timestamp: Date,
    public readonly tenantId: string
  ) {}
}

// 文件名: postgres-snapshot.repository.ts
/**
 * 快照存储
 */
export class PostgresSnapshotRepository implements ISnapshotRepository {
  async saveSnapshot(snapshot: ISnapshot): Promise<void> { }
  async loadSnapshot(aggregateId: string): Promise<ISnapshot | null> { }
}
```

---

## 三、CQRS 相关命名

### 3.1 命令与查询的区分

```typescript
// ✅ 正确 - 命令侧（动词开头）
// 文件名: create-job.command.ts
export class CreateJobCommand implements ICommand { }
// 文件名: submit-job.command.ts
export class SubmitJobCommand implements ICommand { }
// 文件名: cancel-job.command.ts
export class CancelJobCommand implements ICommand { }

// ✅ 正确 - 查询侧（Get/List/Search 开头）
// 文件名: get-job.query.ts
export class GetJobQuery implements IQuery { }
// 文件名: list-jobs.query.ts
export class ListJobsQuery implements IQuery { }
// 文件名: search-jobs.query.ts
export class SearchJobsQuery implements IQuery { }
// 文件名: job-details.query.ts
export class JobDetailsQuery implements IQuery { }
```

### 3.2 读模型与写模型的区分

```typescript
// ✅ 正确 - 写模型（领域实体）
// 文件名: job.aggregate.ts
export class Job extends AggregateRoot<JobProps> { }

// ✅ 正确 - 读模型（各种视图）
// 文件名: job-record.ts（数据库记录）
export class JobRecord { }
// 文件名: job-summary.vo.ts（摘要视图）
export class JobSummary { }
// 文件名: job-details.vo.ts（详情视图）
export class JobDetailsView { }
// 文件名: job-list-item.dto.ts（列表项）
export class JobListItem { }

// ✅ 正确 - 使用 Dto 后缀
// 文件名: job.dto.ts
export class JobDto { }
// 文件名: job-summary.dto.ts
export class JobSummaryDto { }
// 文件名: job-list-item.dto.ts
export class JobListItemDto { }
```

### 3.3 命令总线与查询总线

```typescript
// ✅ 正确 - 文件名: command-bus.interface.ts
export interface ICommandBus {
  execute<T>(command: ICommand): Promise<Result<T>>;
}

// 文件名: query-bus.interface.ts
export interface IQueryBus {
  execute<T>(query: IQuery): Promise<T>;
}

// 使用
const jobId = await commandBus.execute(new CreateJobCommand(props));
const jobDto = await queryBus.execute(new GetJobQuery(jobId));
```

### 3.4 读写仓储分离

```typescript
// ✅ 正确 - 写模型仓储（domain/repositories/）
// 文件名: job.repository.ts
export interface IJobRepository {
  save(job: Job): Promise<void>;
  findById(id: string): Promise<Job | null>;
  delete(id: string): Promise<void>;
}

// ✅ 正确 - 读模型仓储（application/queries/ 或 infrastructure/）
// 文件名: job-read.repository.ts
export interface IJobReadRepository {
  findById(id: string): Promise<JobDto | null>;
  findByCriteria(criteria: JobCriteria): Promise<JobDto[]>;
  search(query: SearchQuery): Promise<PagedResult<JobDto>>;
}
```

---

## 四、事件驱动架构（EDA）相关命名

### 4.1 集成事件

```typescript
// ✅ 正确 - 文件名: job-created.integration-event.ts
/**
 * 任务已创建集成事件（跨服务）
 * 
 * @business-rule 使用点号分隔的事件类型名
 * @business-rule 包含版本信息
 */
export class JobCreatedIntegrationEvent 
  extends IntegrationEvent<JobCreatedPayload> {
  readonly eventType = 'job.created';
  readonly version = 'v1';
  readonly boundedContext = 'job-service';
}

// 文件名: payment-completed.integration-event.ts
export class PaymentCompletedIntegrationEvent
  extends IntegrationEvent<PaymentCompletedPayload> {
  readonly eventType = 'payment.completed';
  readonly version = 'v1';
  readonly boundedContext = 'payment-service';
}
```

### 4.2 事件处理器

```typescript
// ✅ 正确 - 领域事件处理器
// 文件名: job-created.event-handler.ts
export class JobCreatedEventHandler 
  implements IEventHandler<JobCreatedEvent> { }

// ✅ 正确 - 集成事件处理器
// 文件名: payment-completed.event-handler.ts
export class PaymentCompletedEventHandler 
  implements IEventHandler<PaymentCompletedIntegrationEvent> { }
```

### 4.3 事件订阅

```typescript
// ✅ 正确 - 事件订阅装饰器
@EventHandler(JobCreatedEvent)
export class JobCreatedEventHandler {
  async handle(event: JobCreatedEvent): Promise<void> {
    // 处理逻辑
  }
}
```

---

## 五、Outbox/Inbox 模式命名

### 5.1 Outbox 模式

```typescript
// ✅ 正确 - 文件名: outbox-message.interface.ts
/**
 * Outbox 消息接口
 */
export interface IOutboxMessage {
  id: string;
  eventType: string;
  payload: unknown;
  status: OutboxStatus;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  tenantId: string;
}

// 文件名: postgres-outbox.repository.ts
/**
 * PostgreSQL Outbox 实现
 * 
 * @business-rule 保证消息可靠投递
 * @business-rule 支持重试机制
 */
export class PostgresOutbox implements IOutbox {
  async save(message: IOutboxMessage): Promise<void> { }
  async markAsProcessed(id: string): Promise<void> { }
  async getPendingMessages(limit: number): Promise<IOutboxMessage[]> { }
}

// 文件名: outbox.processor.ts
/**
 * Outbox 处理器
 */
export class OutboxProcessor {
  async processPendingMessages(): Promise<void> { }
}
```

### 5.2 Inbox 模式（幂等消费）

```typescript
// ✅ 正确 - 文件名: inbox-message.interface.ts
/**
 * Inbox 消息接口
 */
export interface IInboxMessage {
  id: string;
  eventId: string;
  eventType: string;
  processedAt: Date;
  tenantId: string;
}

// 文件名: postgres-inbox.repository.ts
/**
 * PostgreSQL Inbox 实现
 * 
 * @business-rule 幂等消费，避免重复处理
 */
export class PostgresInbox implements IInbox {
  async isProcessed(eventId: string): Promise<boolean> { }
  async markAsProcessed(message: IInboxMessage): Promise<void> { }
}

// 使用
if (await inbox.isProcessed(event.eventId)) {
  return; // 幂等：已处理过
}
await handler.handle(event);
await inbox.markAsProcessed({ 
  eventId: event.eventId, 
  eventType: event.eventType,
  processedAt: new Date(),
  tenantId: event.metadata.tenantId
});
```

---

## 六、投影（Projection）命名

### 6.1 投影器

```typescript
// ✅ 正确 - 文件名: job.projector.ts
/**
 * 任务投影器
 * 
 * @business-rule 将任务事件投影到 ClickHouse 读模型
 * @business-rule 支持投影重建
 */
export class JobProjector implements IProjector {
  readonly name = 'JobProjector';
  readonly subscribedEvents = ['JobCreated', 'JobItemAdded', 'JobSubmitted'];

  async handle(event: DomainEvent): Promise<void> { }
  async rebuild(): Promise<void> { }
}

// 文件名: job-stats.projector.ts
export class JobStatsProjector implements IProjector {
  readonly name = 'JobStatsProjector';
  // 投影统计信息
}
```

### 6.2 读模型表

```sql
-- ✅ 正确 - 读模型表命名（ClickHouse）
job_facts              -- 事实表
job_summary_mv         -- 物化视图
job_search_index       -- 搜索索引表
job_item_facts         -- 任务项事实表
job_daily_stats        -- 每日统计表

-- 命名模式：[实体]_[用途/类型]
```

### 6.3 投影状态追踪

```typescript
// ✅ 正确 - 文件名: projection-position.interface.ts
/**
 * 投影位置（用于追踪已处理的事件）
 */
export interface IProjectionPosition {
  projectorName: string;
  lastProcessedPosition: number;
  lastProcessedAt: Date;
  tenantId: string;
}

// 文件名: postgres-projection-position.repository.ts
export class PostgresProjectionPositionRepository {
  async getPosition(projectorName: string, tenantId: string): Promise<number>;
  async updatePosition(projectorName: string, position: number, tenantId: string): Promise<void>;
}
```

---

## 七、Sagas/流程管理器命名

```typescript
// ✅ 正确 - 文件名: job-payment.saga.ts
/**
 * 任务支付 Saga
 * 
 * @business-rule 协调任务和支付服务的交互
 * @business-rule 支持补偿操作
 */
export class JobPaymentSaga implements ISaga {
  readonly sagaId = 'job-payment-saga';
  readonly sagaType = 'JobPaymentSaga';
  
  async start(command: StartSagaCommand): Promise<void> { }
  async handle(event: DomainEvent): Promise<void> { }
  async compensate(): Promise<void> { }
}

// 文件名: order-fulfillment.saga.ts
export class OrderFulfillmentSaga implements ISaga {
  // 订单履约流程
}
```

---

## 八、目录结构示例

```
packages/domains-job/src/
├── domain/
│   ├── aggregates/
│   │   └── job.aggregate.ts
│   ├── events/
│   │   ├── job-created.domain-event.ts
│   │   └── job-submitted.domain-event.ts
│   ├── snapshots/
│   │   └── job-snapshot.vo.ts
│   ├── repositories/
│   │   └── job.repository.ts
│   └── ports/
│       ├── job-command.port.ts
│       └── notification.port.ts
├── application/
│   ├── commands/
│   │   ├── create-job.command.ts
│   │   └── handlers/
│   │       └── create-job.handler.ts
│   ├── queries/
│   │   ├── get-job.query.ts
│   │   └── handlers/
│   │       └── get-job.handler.ts
│   ├── sagas/
│   │   └── job-payment.saga.ts
│   └── event-handlers/
│       └── payment-completed.event-handler.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── postgres-job.repository.ts
│   │   ├── postgres-event-store.repository.ts
│   │   ├── postgres-snapshot.repository.ts
│   │   └── clickhouse-job.repository.ts
│   ├── projectors/
│   │   ├── job.projector.ts
│   │   └── job-stats.projector.ts
│   ├── outbox/
│   │   ├── postgres-outbox.repository.ts
│   │   └── outbox.processor.ts
│   ├── inbox/
│   │   └── postgres-inbox.repository.ts
│   ├── consumers/
│   │   └── payment.consumer.ts
│   └── adapters/
│       └── kafka-event-bus.adapter.ts
└── interface/
    ├── middlewares/
    │   └── tenant.middleware.ts
    └── guards/
        └── tenant.guard.ts
```

---

[下一章：快速参考表 →](./spec-10-reference.md)
