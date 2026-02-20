# 基础设施层（Infrastructure）命名规范

[返回目录](./spec.md) | [上一章：应用层](./spec-03-application.md)

---

## 文件命名规范

| 类型 | 文件命名模式 | 示例 |
|:---|:---|:---|
| 仓储实现 | `[tech]-[name].repository.ts` | `postgres-job.repository.ts` |
| 事件存储 | `[tech]-event-store.repository.ts` | `postgres-event-store.repository.ts` |
| 投影器 | `[name].projector.ts` | `job.projector.ts` |
| 事件总线 | `[tech]-event-bus.adapter.ts` | `kafka-event-bus.adapter.ts` |
| 消息消费者 | `[domain].consumer.ts` | `payment.consumer.ts` |
| 外部服务适配器 | `[tech]-[name].adapter.ts` | `stripe-payment.adapter.ts` |
| 数据映射器 | `[name].mapper.ts` | `job.mapper.ts` |
| Outbox | `[tech]-outbox.repository.ts` | `postgres-outbox.repository.ts` |
| Inbox | `[tech]-inbox.repository.ts` | `postgres-inbox.repository.ts` |

---

## 一、仓储实现（Repository Implementation）

```typescript
// ✅ 正确 - 写模型仓储实现
// 文件名: postgres-job.repository.ts
export class PostgresJobRepository implements IJobRepository { }
// 文件名: typeorm-job.repository.ts
export class TypeormJobRepository implements IJobRepository { }
// 文件名: mongo-job.repository.ts
export class MongoJobRepository implements IJobRepository { }

// ✅ 正确 - 读模型仓储实现（CQRS）
// 文件名: clickhouse-job.repository.ts
export class ClickHouseJobRepository implements IJobReadRepository { }
// 文件名: elasticsearch-job-search.repository.ts
export class ElasticsearchJobSearchRepository implements IJobSearchRepository { }
// 文件名: redis-job-cache.repository.ts
export class RedisJobCacheRepository implements IJobCacheRepository { }

// ❌ 错误
export class JobRepositoryImpl { }  // 缺少技术标识
export class JobRepo { }            // 缩写不清晰
```

### 1.1 仓储实现最佳实践

```typescript
// ✅ 正确 - 文件名: postgres-job.repository.ts
@injectable()
export class PostgresJobRepository implements IJobRepository {
  constructor(
    private readonly pool: Pool,
    private readonly jobMapper: JobMapper
  ) {}

  /**
   * 保存任务
   * 
   * @business-rule 使用乐观锁控制并发
   */
  async save(job: Job): Promise<void> {
    const data = this.jobMapper.toPersistence(job);
    await this.pool.query(
      `INSERT INTO jobs (id, data, version, tenant_id) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (id) DO UPDATE SET data = $2, version = $3`,
      [job.id, JSON.stringify(data), job.version, job.tenantId]
    );
  }

  async findById(id: string): Promise<Job | null> {
    const { rows } = await this.pool.query(
      'SELECT data FROM jobs WHERE id = $1',
      [id]
    );
    if (!rows[0]) return null;
    return this.jobMapper.toDomain(rows[0].data);
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<Job | null> {
    const { rows } = await this.pool.query(
      'SELECT data FROM jobs WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!rows[0]) return null;
    return this.jobMapper.toDomain(rows[0].data);
  }
}
```

**命名模式**：
- 文件：`[技术]-[实体].repository.ts`
- 类：`[技术][实体]Repository`

---

## 二、事件存储（Event Store）

```typescript
// ✅ 正确
// 文件名: postgres-event-store.repository.ts
export class PostgresEventStore implements IEventStore { }
// 文件名: eventstoredb-event-store.repository.ts
export class EventstoreDbEventStore implements IEventStore { }
// 文件名: in-memory-event-store.repository.ts
export class InMemoryEventStore implements IEventStore { }  // 测试用

// ❌ 错误
export class EventStoreImpl { }  // 缺少技术标识
```

### 2.1 事件存储最佳实践

```typescript
// ✅ 正确 - 文件名: postgres-event-store.repository.ts
@injectable()
export class PostgresEventStore implements IEventStore {
  constructor(private readonly pool: Pool) {}

  /**
   * 追加事件到流
   * 
   * @business-rule 使用乐观锁控制并发
   * @business-rule 保证事件顺序性
   */
  async appendToStream(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 检查并发
      const { rows } = await client.query(
        'SELECT MAX(version) as version FROM event_store WHERE stream_id = $1',
        [streamId]
      );
      const currentVersion = rows[0]?.version ?? -1;
      if (currentVersion !== expectedVersion) {
        throw new ConcurrencyError(streamId, expectedVersion, currentVersion);
      }

      // 追加事件
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        await client.query(
          `INSERT INTO event_store (event_id, stream_id, event_type, data, metadata, version, tenant_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            event.eventId,
            streamId,
            event.eventType,
            JSON.stringify(event.data),
            JSON.stringify(event.metadata),
            expectedVersion + i + 1,
            event.metadata.tenantId
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(streamId: string, fromVersion = 0): Promise<DomainEvent[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM event_store WHERE stream_id = $1 AND version > $2 ORDER BY version ASC',
      [streamId, fromVersion]
    );
    return rows.map(row => this.deserializeEvent(row));
  }

  private deserializeEvent(row: EventRow): DomainEvent {
    const eventType = this.eventMap.get(row.event_type);
    if (!eventType) {
      throw new Error(`未知事件类型: ${row.event_type}`);
    }
    return new eventType(row.data, row.metadata);
  }
}
```

**命名模式**：
- 文件：`[技术]-event-store.repository.ts`
- 类：`[技术]EventStore`

---

## 三、投影（Projection）

```typescript
// ✅ 正确 - 投影器
// 文件名: job.projector.ts
export class JobProjector implements IProjector { }
// 文件名: customer.projector.ts
export class CustomerProjector implements IProjector { }

// ❌ 错误
export class JobProjection { }  // 与投影数据混淆
```

### 3.1 投影器最佳实践

```typescript
// ✅ 正确 - 文件名: job.projector.ts
/**
 * 任务投影器
 * 
 * @business-rule 将任务事件投影到 ClickHouse 读模型
 * @business-rule 支持投影重建
 */
@injectable()
export class JobProjector implements IProjector {
  readonly name = 'JobProjector';
  readonly subscribedEvents = [
    'JobCreated',
    'JobItemAdded',
    'JobSubmitted',
    'JobCompleted'
  ];

  constructor(
    private readonly clickhouse: ClickHouseClient,
    private readonly redis: RedisClient
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'JobCreated':
        await this.onJobCreated(event as JobCreatedEvent);
        break;
      case 'JobItemAdded':
        await this.onJobItemAdded(event as JobItemAddedEvent);
        break;
      // ...
    }
    await this.invalidateCache(event.aggregateId);
  }

  private async onJobCreated(event: JobCreatedEvent): Promise<void> {
    await this.clickhouse.insert({
      table: 'job_facts',
      values: [{
        job_id: event.data.jobId,
        tenant_id: event.data.tenantId,
        customer_id: event.data.customerId,
        status: 'draft',
        title: event.data.title,
        total_amount: 0,
        created_at: event.occurredAt
      }]
    });
  }

  /**
   * 重建投影
   * 
   * @business-rule 从事件存储重放所有事件重建读模型
   */
  async rebuild(): Promise<void> {
    // 清空现有投影
    await this.clickhouse.query('TRUNCATE TABLE job_facts');
    // 重放事件
    // ...
  }
}
```

**命名模式**：
- 文件：`[实体].projector.ts`
- 类：`[实体]Projector`

---

## 四、事件总线适配器（Event Bus Adapter）

```typescript
// ✅ 正确
// 文件名: kafka-event-bus.adapter.ts
export class KafkaEventBusAdapter implements IEventBus { }
// 文件名: rabbitmq-event-bus.adapter.ts
export class RabbitMqEventBusAdapter implements IEventBus { }
// 文件名: redis-event-bus.adapter.ts
export class RedisEventBusAdapter implements IEventBus { }
// 文件名: in-memory-event-bus.adapter.ts
export class InMemoryEventBusAdapter implements IEventBus { }  // 测试用

// ❌ 错误
export class KafkaEventBus { }  // 缺少 Adapter 后缀
```

**命名模式**：
- 文件：`[技术]-event-bus.adapter.ts`
- 类：`[技术]EventBusAdapter`

---

## 五、消息消费者（Message Consumer）

```typescript
// ✅ 正确
// 文件名: payment.consumer.ts
export class PaymentConsumer { }
// 文件名: inventory.consumer.ts
export class InventoryConsumer { }
// 文件名: notification.consumer.ts
export class NotificationConsumer { }

// ❌ 错误
export class PaymentEventConsumer { }  // 冗余
```

### 5.1 消费者最佳实践

```typescript
// ✅ 正确 - 文件名: payment.consumer.ts
/**
 * 支付消息消费者
 * 
 * @business-rule 幂等消费，避免重复处理
 * @business-rule 失败时触发重试
 */
@injectable()
export class PaymentConsumer {
  constructor(
    private readonly commandBus: ICommandBus,
    private readonly inbox: IInbox,
    private readonly logger: ILogger
  ) {}

  async start(): Promise<void> {
    const consumer = new KafkaConsumer({
      topic: 'payment-events',
      groupId: 'job-service-payment-group'
    });

    await consumer.subscribe(async (message) => {
      const { event, metadata } = message;

      // 幂等性检查
      if (await this.inbox.isProcessed(event.eventId)) {
        this.logger.debug('事件已处理', { eventId: event.eventId });
        return;
      }

      try {
        await this.handleEvent(event, metadata);
        await this.inbox.markAsProcessed({
          eventId: event.eventId,
          eventType: event.eventType,
          processedAt: new Date()
        });
      } catch (error) {
        this.logger.error('处理事件失败', { event, error });
        throw error; // 触发重试
      }
    });
  }

  private async handleEvent(event: IntegrationEvent, metadata: EventMetadata): Promise<void> {
    switch (event.eventType) {
      case 'PaymentCompleted':
        await this.commandBus.execute(new MarkJobAsPaidCommand({
          jobId: event.data.jobId,
          paymentId: event.data.paymentId
        }));
        break;
    }
  }
}
```

**命名模式**：
- 文件：`[领域].consumer.ts`
- 类：`[领域]Consumer`

---

## 六、外部服务适配器（External Service Adapter）

```typescript
// ✅ 正确 - 支付网关适配器
// 文件名: stripe-payment.adapter.ts
export class StripePaymentAdapter implements IPaymentGatewayPort { }
// 文件名: paypal-payment.adapter.ts
export class PaypalPaymentAdapter implements IPaymentGatewayPort { }

// ✅ 正确 - 通知服务适配器
// 文件名: sendgrid-email.adapter.ts
export class SendgridEmailAdapter implements INotificationPort { }
// 文件名: twilio-sms.adapter.ts
export class TwilioSmsAdapter implements INotificationPort { }

// ✅ 正确 - 存储服务适配器
// 文件名: s3-storage.adapter.ts
export class S3StorageAdapter implements IFileStoragePort { }

// ❌ 错误
export class StripePaymentGateway { }  // 缺少 Adapter 后缀
```

**命名模式**：
- 文件：`[技术/服务商]-[功能].adapter.ts`
- 类：`[技术/服务商][功能]Adapter`

---

## 七、数据映射器（Data Mapper）

```typescript
// ✅ 正确
// 文件名: job.mapper.ts
export class JobMapper { }
// 文件名: customer.mapper.ts
export class CustomerMapper { }

// ❌ 错误
export class JobDataMapper { }  // 冗余
```

### 7.1 映射器最佳实践

```typescript
// ✅ 正确 - 文件名: job.mapper.ts
@injectable()
export class JobMapper {
  /**
   * 持久化模型 -> 领域模型
   */
  toDomain(persistence: JobPersistence): Job {
    return Job.rehydrate({
      id: persistence.id,
      customerId: persistence.customer_id,
      tenantId: persistence.tenant_id,
      status: persistence.status as JobStatus,
      items: persistence.items.map(item => this.itemToDomain(item)),
      version: persistence.version
    });
  }

  /**
   * 领域模型 -> 持久化模型
   */
  toPersistence(domain: Job): JobPersistence {
    return {
      id: domain.id,
      customer_id: domain.customerId,
      tenant_id: domain.tenantId,
      status: domain.status,
      items: domain.items.map(item => this.itemToPersistence(item)),
      version: domain.version
    };
  }

  /**
   * 领域模型 -> DTO
   */
  toDto(domain: Job): JobDto {
    return {
      id: domain.id,
      customerId: domain.customerId,
      status: domain.status,
      total: domain.total.amount,
      itemCount: domain.items.length
    };
  }
}
```

**命名模式**：
- 文件：`[实体].mapper.ts`
- 类：`[实体]Mapper`

---

## 八、Outbox/Inbox 实现

### 8.1 Outbox 模式

```typescript
// ✅ 正确 - 文件名: postgres-outbox.repository.ts
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

// Outbox 处理器
// 文件名: outbox.processor.ts
export class OutboxProcessor {
  async processPendingMessages(): Promise<void> { }
}
```

### 8.2 Inbox 模式（幂等消费）

```typescript
// ✅ 正确 - 文件名: postgres-inbox.repository.ts
/**
 * PostgreSQL Inbox 实现
 * 
 * @business-rule 幂等消费，避免重复处理
 */
export class PostgresInbox implements IInbox {
  async isProcessed(eventId: string): Promise<boolean> { }
  async markAsProcessed(message: IInboxMessage): Promise<void> { }
}
```

**命名模式**：
- 文件：`[技术]-outbox.repository.ts` / `[技术]-inbox.repository.ts`
- 类：`[技术]Outbox` / `[技术]Inbox`

---

## 目录结构示例

```
packages/domains-job/src/infrastructure/
├── persistence/
│   ├── postgres-job.repository.ts
│   ├── postgres-event-store.repository.ts
│   ├── clickhouse-job.repository.ts
│   ├── job.mapper.ts
│   └── schemas/
│       └── job.schema.ts
├── adapters/
│   ├── kafka-event-bus.adapter.ts
│   ├── stripe-payment.adapter.ts
│   └── sendgrid-email.adapter.ts
├── projectors/
│   ├── job.projector.ts
│   └── job-stats.projector.ts
├── consumers/
│   ├── payment.consumer.ts
│   └── notification.consumer.ts
├── outbox/
│   ├── postgres-outbox.repository.ts
│   └── outbox.processor.ts
├── inbox/
│   └── postgres-inbox.repository.ts
└── di/
    └── job.module.ts
```

---

[下一章：接口层命名规范 →](./spec-05-interface.md)
