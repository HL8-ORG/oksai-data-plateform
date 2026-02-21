# Event Store 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/event-store` 实现事件溯源（Event Sourcing）模式的核心基础设施：

- **事件流**：`EventStream` 值对象，标识聚合的事件流
- **事件存储**：持久化领域事件
- **版本控制**：支持乐观并发控制

### 1.2 事件溯源原则

| 原则 | 说明 |
|------|------|
| **追加写入** | 事件只能追加，不可修改或删除 |
| **顺序保证** | 事件按顺序存储，保证时序 |
| **完整审计** | 所有状态变更都有完整记录 |
| **时间旅行** | 可重放事件恢复任意时刻状态 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/event-store/
├── lib/
│   ├── event-stream.vo.ts           # 事件流值对象
│   ├── domain-event.base.ts         # 领域事件基类
│   ├── event-store.port.ts          # 事件存储端口
│   └── event-sourced.repository.ts  # 事件溯源仓储基类
├── spec/
│   └── ...
└── index.ts
```

### 2.2 事件溯源流程

```
┌─────────────────────────────────────────────────────────────┐
│                     写入流程                                 │
└─────────────────────────────────────────────────────────────┘

Command
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ CommandHandler                                               │
│  1. 从 EventStore 读取事件流                                 │
│  2. 重放事件，恢复聚合状态                                   │
│  3. 执行业务逻辑                                             │
│  4. 产生新事件                                               │
│  5. 追加新事件到 EventStore                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ EventStore                                                   │
│  ┌─────┬─────┬─────┬─────┬─────┐                            │
│  │ E1  │ E2  │ E3  │ E4  │ E5  │  ← 追加新事件              │
│  └─────┴─────┴─────┴─────┴─────┘                            │
│  version: 1  2   3   4   5                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     读取流程                                 │
└─────────────────────────────────────────────────────────────┘

Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Projector                                                    │
│  1. 订阅事件流                                               │
│  2. 处理事件，更新读模型                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Read Model (ClickHouse)                                      │
│  ┌─────────────────────────────────────────┐                │
│  │ tenant_id | job_id | title | status     │                │
│  │ tenant-1  | job-1  | test  | completed  │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、核心概念

### 3.1 EventStream

事件流标识一个聚合的所有事件：

```typescript
import { EventStream } from '@oksai/event-store';

// 创建事件流
const stream = EventStream.create({
  aggregateId: 'job-123',
  aggregateType: 'Job',
  tenantId: 'tenant-456',
});

// 事件流 ID 格式: {tenantId}:{aggregateType}:{aggregateId}
console.log(stream.streamId); // 'tenant-456:Job:job-123'
```

### 3.2 DomainEvent

领域事件基类：

```typescript
import { DomainEvent } from '@oksai/event-store';

interface JobCreatedPayload {
  title: string;
  tenantId: string;
}

class JobCreatedEvent implements DomainEvent<JobCreatedPayload> {
  public readonly occurredAt: Date;
  public readonly eventType = 'job.created';
  public readonly version = 1;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: JobCreatedPayload
  ) {
    this.occurredAt = new Date();
  }
}
```

### 3.3 事件存储接口

```typescript
interface IEventStore {
  /**
   * 追加事件到事件流
   * @param stream 事件流
   * @param events 事件列表
   * @param expectedVersion 期望版本（乐观锁）
   */
  appendEvents(
    stream: EventStream,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void>;

  /**
   * 读取事件流的所有事件
   */
  getEvents(stream: EventStream): Promise<DomainEvent[]>;

  /**
   * 从指定版本读取事件
   */
  getEventsFromVersion(
    stream: EventStream,
    version: number
  ): Promise<DomainEvent[]>;
}
```

---

## 四、使用方式

### 4.1 定义事件溯源仓储

```typescript
import { EventSourcedRepository } from '@oksai/event-store';

class EventSourcedJobRepository extends EventSourcedRepository<Job> {
  constructor(eventStore: IEventStore) {
    super(eventStore, 'Job');
  }

  async findById(id: string): Promise<Job | null> {
    const stream = EventStream.create({
      aggregateId: id,
      aggregateType: 'Job',
      tenantId: this.tenantContext.getTenantId(),
    });

    const events = await this.eventStore.getEvents(stream);
    if (events.length === 0) {
      return null;
    }

    return this.rebuild(events);
  }

  async save(job: Job): Promise<void> {
    const stream = EventStream.create({
      aggregateId: job.id.toValue(),
      aggregateType: 'Job',
      tenantId: job.tenantId,
    });

    const newEvents = job.domainEvents;
    if (newEvents.length === 0) {
      return;
    }

    await this.eventStore.appendEvents(
      stream,
      newEvents,
      job.version - newEvents.length
    );

    job.clearEvents();
  }

  private rebuild(events: DomainEvent[]): Job {
    // 从事件重建聚合
    let job: Job | null = null;

    for (const event of events) {
      job = this.applyEvent(job, event);
    }

    return job!;
  }
}
```

### 4.2 聚合根实现事件溯源

```typescript
class Job extends AggregateRoot<JobProps> {
  private constructor(props: JobProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get version(): number {
    return this.props.version;
  }

  // 从事件重建
  static fromEvents(events: DomainEvent[]): Job {
    let job: Job | null = null;

    for (const event of events) {
      job = this.applyEvent(job, event);
    }

    return job!;
  }

  private static applyEvent(job: Job | null, event: DomainEvent): Job {
    if (event.eventType === 'job.created') {
      return Job.createFromEvent(event);
    }
    if (event.eventType === 'job.started') {
      job!.markAsStarted();
      return job!;
    }
    // ... 其他事件
    return job!;
  }
}
```

---

## 五、API 参考

### 5.1 EventStream

```typescript
interface EventStreamProps {
  aggregateId: string;
  aggregateType: string;
  tenantId: string;
}

class EventStream extends ValueObject<EventStreamProps> {
  get aggregateId(): string;
  get aggregateType(): string;
  get tenantId(): string;
  get streamId(): string; // {tenantId}:{aggregateType}:{aggregateId}

  static create(props: EventStreamProps): EventStream;
}
```

### 5.2 DomainEvent

```typescript
interface DomainEvent<T = unknown> {
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: T;
  readonly occurredAt: Date;
  readonly version: number;
}
```

### 5.3 IEventStore

```typescript
interface IEventStore {
  appendEvents(
    stream: EventStream,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void>;

  getEvents(stream: EventStream): Promise<DomainEvent[]>;

  getEventsFromVersion(
    stream: EventStream,
    version: number
  ): Promise<DomainEvent[]>;
}
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 95.74% |
| Lines | 100% |

---

## 七、注意事项

1. **乐观并发**：使用 `expectedVersion` 防止并发写入冲突
2. **事件不可变**：事件一旦写入不可修改
3. **快照优化**：对于事件数量多的聚合，定期创建快照
4. **事件版本**：事件结构变更时需要处理版本兼容

---

## 八、与其他模块集成

### 8.1 与 @oksai/cqrs 集成

```typescript
@CommandHandler(CreateJobCommand)
class CreateJobHandler implements ICommandHandler<CreateJobCommand> {
  constructor(
    private readonly jobRepository: EventSourcedJobRepository
  ) {}

  async execute(command: CreateJobCommand): Promise<void> {
    const job = Job.create(command);
    await this.jobRepository.save(job);
  }
}
```

### 8.2 与 @oksai/eda 集成

```typescript
// 事件存储后发布到事件总线
await this.eventStore.appendEvents(stream, events, version);

for (const event of events) {
  await this.eventBus.publish(new IntegrationEvent(event));
}
```
