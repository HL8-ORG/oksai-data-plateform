# EDA 模块技术规范

> 版本：0.2.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/eda`（Event-Driven Architecture）实现企业级事件驱动架构的核心组件：

- **Transactional Outbox 模式**：确保事件可靠发布，避免消息丢失
- **Inbox 去重**：保证事件处理的幂等性
- **Kafka 集成**：可插拔的消息总线适配器
- **插件订阅者系统**：支持插件扩展事件处理能力
- **CQRS 投影**：从 Outbox 构建读模型
- **Prometheus 指标**：完整的事件处理可观测性

### 1.2 设计原则

- **At-Least-Once 语义**：通过 Inbox 去重实现 Exactly-Once 效果
- **最终一致性**：事件异步处理，保证最终一致性
- **可插拔架构**：Kafka、消息队列等可按需启用
- **幂等设计**：所有处理逻辑必须支持重复执行
- **租户隔离**：全链路多租户上下文传递

### 1.3 核心概念

| 概念 | 说明 |
|:---|:---|
| **OksaiIntegrationEvent** | 稳定的集成事件契约（定义在 `@oksai/contracts`） |
| **Outbox** | 事件发布表，确保事件与业务事务原子写入 |
| **Inbox** | 事件去重表，保证幂等处理 |
| **Projection** | 从事件流构建读模型 |
| **Subscriber** | 插件级事件订阅者 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/eda/
├── lib/
│   ├── context/
│   │   └── worker-context.util.ts      # Worker CLS 上下文工具
│   ├── kafka/
│   │   ├── kafka.config.ts             # Kafka 配置解析
│   │   ├── kafka.loader.ts             # KafkaJS 动态加载
│   │   ├── kafka-event-producer.ts     # Kafka 事件生产者
│   │   └── kafka-event-consumer.ts     # Kafka 事件消费者
│   ├── metrics/
│   │   └── eda.metrics.ts              # Prometheus 指标
│   ├── outbox/
│   │   ├── outbox-envelope.ts          # 事件信封解析
│   │   ├── outbox-producer.ts          # 事件生产（写入 Outbox）
│   │   ├── outbox-processor.ts         # 事件处理（Outbox → 业务）
│   │   └── outbox-retry.util.ts        # 重试策略
│   ├── subscriber/
│   │   ├── integration-event-subscriber.interface.ts  # 订阅者接口
│   │   ├── subscriber.tokens.ts        # DI Token
│   │   └── subscriber-dispatcher.service.ts  # 分发器
│   ├── workers/
│   │   ├── polling-worker.ts           # 轮询 Worker 基类
│   │   ├── outbox-publisher.ts         # Outbox → Kafka Publisher
│   │   ├── outbox-reaper.ts            # 僵尸任务清理
│   │   ├── outbox-projection-processor.ts     # CQRS 投影处理器
│   │   └── subscriber-projection-processor.ts # 订阅者投影处理器
│   ├── event-bus.ts                    # 进程内事件总线
│   ├── event-handler.ts                # 事件处理器接口
│   └── integration-event.ts            # 集成事件工厂
└── index.ts
```

### 2.2 事件驱动流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Domain Layer                                       │
│  AggregateRoot.domainEvents (领域事件)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 转换 + 事务写入
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        integration_outbox 表                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ status: pending → processing → published/failed/dead               │   │
│  │ retry_count, next_retry_at, last_error                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ OutboxPublisher   │   │ OutboxProcessor   │   │ ProjectionProc    │
│ (pending→queued)  │   │ (pending→publish) │   │ (published)       │
└───────────────────┘   └───────────────────┘   └───────────────────┘
            │                       │                       │
            ▼                       │                       ▼
┌───────────────────┐               │           ┌───────────────────┐
│     Kafka         │               │           │   ClickHouse      │
│ (可选，跨服务)    │               │           │   (读模型)        │
└───────────────────┘               │           └───────────────────┘
                                    │
                                    ▼
                        ┌───────────────────┐
                        │ integration_inbox │
                        │ _processed 表     │
                        │ (幂等去重)        │
                        └───────────────────┘
```

### 2.3 状态机

```
                    ┌──────────┐
                    │ pending  │ ← 初始状态
                    └────┬─────┘
                         │ claim
                         ▼
                    ┌──────────┐
          ┌────────│processing│────────┐
          │        └────┬─────┘        │
          │             │              │
    success        retry/failed    timeout
          │             │              │
          ▼             ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │published │  │  failed  │  │  failed  │
    └──────────┘  └────┬─────┘  └──────────┘
                       │
                  max_retry
                       │
                       ▼
                  ┌──────────┐
                  │   dead   │ → dead_letter 表
                  └──────────┘
```

---

## 三、核心组件

### 3.1 OksaiIntegrationEvent（集成事件契约）

定义在 `@oksai/contracts`，由 `@oksai/eda` 重导出：

```typescript
import type { OksaiIntegrationEvent } from '@oksai/eda';

/**
 * 稳定的集成事件信封
 */
interface OksaiIntegrationEvent {
  tenantId: string;      // 租户 ID（必须）
  eventId: string;       // 事件唯一 ID
  eventName: string;     // 事件名称（稳定契约）
  eventVersion: number;  // 事件版本
  actorId?: string;      // 操作者 ID
  requestId?: string;    // 请求追踪 ID
  locale?: string;       // 语言环境
  partitionKey: string;  // 分区键（必须）
  occurredAt: string;    // ISO 8601 时间戳
  payload: unknown;      // 事件负载
}
```

### 3.2 OutboxProducer（事件生产）

将集成事件写入 Outbox 表，与业务事务原子提交：

```typescript
import {
  buildIntegrationEventFromCurrentContext,
  insertIntegrationOutboxEvent,
} from '@oksai/eda';

// 在事务中写入 Outbox
async function createJob(command: CreateJobCommand, em: EntityManager) {
  // 1. 业务逻辑
  const job = Job.create(command);
  
  // 2. 构建集成事件（从 CLS 上下文提取租户信息）
  const event = buildIntegrationEventFromCurrentContext({
    eventName: 'JobCreated',
    eventVersion: 1,
    payload: { id: job.id, title: job.title },
    partitionKey: job.id,
  });
  
  // 3. 原子写入（与业务数据同一事务）
  await em.persistAndFlush(job);
  await insertIntegrationOutboxEvent(em, event);
}
```

### 3.3 OutboxProcessor（事件处理）

从 Outbox 表 claim 事件并处理：

```typescript
import { IntegrationOutboxProcessor, type OutboxLogger } from '@oksai/eda';

const processor = new IntegrationOutboxProcessor({
  processorName: 'communication.outbox-worker',
  consumerName: 'communication.email-sender',
  em: entityManager,
  logger: logger as OutboxLogger,
  
  // 业务处理函数
  async handleEvent({ row, envelope }) {
    // envelope 已通过校验，可直接使用
    await sendEmail({
      tenantId: envelope.tenantId,
      to: envelope.payload.email,
      subject: '欢迎',
    });
  },
});

// 轮询处理
while (running) {
  await processor.processBatch(100);
  await sleep(1000);
}
```

### 3.4 投影处理器（CQRS）

从 `published` 状态的 Outbox 构建读模型：

```typescript
import {
  IntegrationOutboxProjectionProcessor,
  type PublishedIntegrationOutboxRow,
} from '@oksai/eda';

const projector = new IntegrationOutboxProjectionProcessor({
  processorName: 'analytics.job-projector',
  consumerName: 'analytics.job-projection',
  eventNames: ['JobCreated', 'JobCompleted', 'JobFailed'],
  em: entityManager,
  logger,
  
  async handleEvent({ row, envelope }) {
    // 写入 ClickHouse 读模型
    await clickhouse.insert('jobs', {
      id: row.event_id,
      tenant_id: envelope.tenantId,
      title: envelope.payload.title,
      status: envelope.payload.status,
      created_at: envelope.occurredAt,
    });
  },
});

await projector.processBatch(1000);
```

### 3.5 插件订阅者系统

插件可以声明 `IOksaiIntegrationEventSubscriber` 来订阅事件：

```typescript
import { type IOksaiIntegrationEventSubscriber } from '@oksai/eda';

@Injectable()
export class JobCreatedNotificationSubscriber implements IOksaiIntegrationEventSubscriber {
  readonly subscriberName = 'job-notification';
  readonly eventName = 'JobCreated';
  readonly eventVersion = 1;
  readonly timeoutMs = 5000;

  async handle({ envelope, logger }: { envelope: OksaiIntegrationEvent; logger: SubscriberLogger }) {
    // 发送通知
    await this.notificationService.send({
      tenantId: envelope.tenantId,
      type: 'job_created',
      data: envelope.payload,
    });
  }
}
```

插件元数据声明：

```typescript
// plugin.module.ts
import { type OksaiPluginMeta } from '@oksai/plugin';

export const pluginMeta: OksaiPluginMeta = {
  name: 'notification-plugin',
  version: '1.0.0',
  subscribers: [
    JobCreatedNotificationSubscriber,
  ],
};
```

### 3.6 Kafka 集成

可选的 Kafka 消息总线：

```typescript
import {
  KafkaIntegrationEventProducer,
  KafkaIntegrationEventConsumer,
} from '@oksai/eda';

// 生产者（Outbox → Kafka）
const producer = await KafkaIntegrationEventProducer.fromEnv({
  configService,
  logger,
  topic: 'oksai.integration-events',
});

if (producer) {
  await producer.start();
  await producer.publish(envelope);
}

// 消费者（Kafka → 业务处理）
const consumer = await KafkaIntegrationEventConsumer.fromEnv({
  configService,
  logger,
  groupId: 'oksai.notification-service',
  topic: 'oksai.integration-events',
});

if (consumer) {
  await consumer.start(async ({ envelope }) => {
    await handleIntegrationEvent(envelope);
  });
}
```

### 3.7 轮询 Worker 基类

通用的轮询 Worker 实现：

```typescript
import { createPollingWorker, readBooleanFromEnv } from '@oksai/eda';

const worker = createPollingWorker({
  workerName: 'outbox-publisher',
  intervalMs: 1000,
  batchSize: 100,
  enabled: readBooleanFromEnv(process.env.OUTBOX_PUBLISHER_ENABLED, true),
  
  async tick(batchSize) {
    const processor = new IntegrationOutboxPublisher({ ... });
    return processor.processBatch(batchSize);
  },
  
  onError(error) {
    logger.error({ err: error.message }, 'Worker 执行失败');
  },
});

// 启动
worker.start();

// 优雅关闭
process.on('SIGTERM', () => worker.stop());
```

### 3.8 Prometheus 指标

完整的可观测性指标：

```typescript
import { startOksaiMetrics, getOksaiMetricsRecorder } from '@oksai/eda';

// 启动指标收集
await startOksaiMetrics({ port: 9090 });

// 获取记录器
const metrics = getOksaiMetricsRecorder();

// 记录事件处理
metrics.incIntegrationEventProcessedTotal({
  mode: 'outbox',
  processor: 'email-sender',
  eventName: 'UserRegistered',
  result: 'success',
});

// 记录延迟
metrics.observeIntegrationEventLagMs({
  mode: 'outbox',
  processor: 'email-sender',
  eventName: 'UserRegistered',
  lagMs: 150,
});
```

**指标列表**：

| 指标名称 | 类型 | 标签 | 说明 |
|:---|:---|:---|:---|
| `oksai_integration_event_processed_total` | Counter | mode, processor, eventName, result | 处理事件总数 |
| `oksai_integration_event_lag_ms` | Histogram | mode, processor, eventName | 事件延迟（发生 → 处理） |
| `oksai_integration_event_duration_ms` | Histogram | mode, processor, eventName | 处理耗时 |

---

## 四、数据库表结构

### 4.1 integration_outbox

```sql
CREATE TABLE integration_outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  event_id      VARCHAR(128) NOT NULL UNIQUE,
  event_name    VARCHAR(128) NOT NULL,
  event_version INT NOT NULL DEFAULT 1,
  partition_key VARCHAR(256) NOT NULL,
  payload       JSONB NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'pending',
    -- pending, processing, published, failed, dead
  retry_count   INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  last_error    TEXT,
  occurred_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_status_retry ON integration_outbox(status, next_retry_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX idx_outbox_occurred ON integration_outbox(occurred_at);
```

### 4.2 integration_inbox_processed

```sql
CREATE TABLE integration_inbox_processed (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  event_id      VARCHAR(128) NOT NULL,
  consumer_name VARCHAR(256) NOT NULL,
  processed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(event_id, consumer_name)
);

CREATE INDEX idx_inbox_consumer ON integration_inbox_processed(consumer_name);
```

### 4.3 integration_outbox_dead_letter

```sql
CREATE TABLE integration_outbox_dead_letter (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  event_id       VARCHAR(128) NOT NULL UNIQUE,
  event_name     VARCHAR(128) NOT NULL,
  event_version  INT NOT NULL,
  partition_key  VARCHAR(256) NOT NULL,
  payload        JSONB NOT NULL,
  retry_count    INT NOT NULL,
  last_error     TEXT,
  occurred_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  dead_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processor_name VARCHAR(256),
  consumer_name  VARCHAR(256),
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 4.4 integration_event_subscriber_retry_state

```sql
CREATE TABLE integration_event_subscriber_retry_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  event_id        VARCHAR(128) NOT NULL,
  subscriber_name VARCHAR(256) NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'retrying',
    -- retrying, dead
  retry_count     INT NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMP WITH TIME ZONE,
  last_error      TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(event_id, subscriber_name)
);
```

---

## 五、使用方式

### 5.1 基本发布流程

```typescript
import {
  buildIntegrationEventFromCurrentContext,
  insertIntegrationOutboxEvent,
  type OksaiIntegrationEvent,
} from '@oksai/eda';
import { runWithOksaiContext } from '@oksai/context';

// 在请求上下文中发布事件
await runWithOksaiContext(
  { tenantId: 'tenant-1', userId: 'user-1', requestId: 'req-1' },
  async () => {
    const event = buildIntegrationEventFromCurrentContext({
      eventName: 'OrderCreated',
      eventVersion: 1,
      payload: { orderId: 'order-1', items: [...] },
      partitionKey: 'order-1',
    });
    
    await insertIntegrationOutboxEvent(entityManager, event);
  }
);
```

### 5.2 Worker 实现

```typescript
// workers/outbox-publisher.worker.ts
import { createPollingWorker, IntegrationOutboxPublisher } from '@oksai/eda';

export function createOutboxPublisherWorker(em: EntityManager, logger: Logger) {
  return createPollingWorker({
    workerName: 'outbox-publisher',
    intervalMs: 1000,
    batchSize: 100,
    enabled: process.env.OUTBOX_PUBLISHER_ENABLED !== 'false',
    
    async tick(batchSize) {
      const publisher = new IntegrationOutboxPublisher({
        publisherName: 'kafka-publisher',
        em,
        logger,
        kafkaProducer: kafkaProducerInstance,
      });
      
      return publisher.processBatch(batchSize);
    },
  });
}
```

### 5.3 投影 Worker

```typescript
// workers/job-projection.worker.ts
import {
  createPollingWorker,
  IntegrationOutboxProjectionProcessor,
} from '@oksai/eda';

export function createJobProjectionWorker(
  em: EntityManager,
  clickhouse: ClickHouseClient,
  logger: Logger,
) {
  return createPollingWorker({
    workerName: 'job-projection',
    intervalMs: 5000,
    batchSize: 1000,
    
    async tick(batchSize) {
      const processor = new IntegrationOutboxProjectionProcessor({
        processorName: 'job-projection',
        consumerName: 'analytics.job-projection',
        eventNames: ['JobCreated', 'JobUpdated', 'JobCompleted', 'JobFailed'],
        em,
        logger,
        
        async handleEvent({ row, envelope }) {
          await clickhouse.insert('jobs', {
            id: row.event_id,
            tenant_id: envelope.tenantId,
            ...envelope.payload,
          });
        },
      });
      
      return processor.processBatch(batchSize);
    },
  });
}
```

### 5.4 NestJS 集成

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@oksai/config';

@Module({
  imports: [
    ConfigModule.forRootSync(),
    // EDA 模块的依赖通过 NestJS DI 自动注入
  ],
  providers: [
    // 注册订阅者
    JobCreatedNotificationSubscriber,
  ],
})
export class AppModule {}
```

---

## 六、API 参考

### 6.1 集成事件

```typescript
// 从 @oksai/contracts 导入，由 @oksai/eda 重导出
export type { OksaiIntegrationEvent, IOksaiIntegrationEvent } from '@oksai/contracts';
export { parseOksaiIntegrationEvent, isValidOksaiIntegrationEvent } from '@oksai/contracts';

// 集成事件工厂
export class IntegrationEvent implements IIntegrationEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: Date;

  static create(props: {
    eventName: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }): IntegrationEvent;
}
```

### 6.2 Outbox 生产

```typescript
// 构建集成事件（从 CLS 上下文）
function buildIntegrationEventFromCurrentContext(input: {
  eventName: string;
  eventVersion: number;
  payload: unknown;
  partitionKey: string;
  actorId?: string;
  requestId?: string;
  locale?: string;
  occurredAt?: string;
}): OksaiIntegrationEvent;

// 写入 Outbox
function insertIntegrationOutboxEvent(
  em: EntityManager,
  event: OksaiIntegrationEvent,
  options?: InsertIntegrationOutboxEventOptions
): Promise<void>;
```

### 6.3 Outbox 处理

```typescript
interface IntegrationOutboxProcessorOptions {
  processorName: string;
  consumerName: string;
  claimStatus?: 'pending' | 'queued';
  em: EntityManager;
  logger: OutboxLogger;
  handleEvent: (input: {
    row: IntegrationOutboxRow;
    envelope: OksaiIntegrationEvent;
  }) => Promise<void>;
}

class IntegrationOutboxProcessor {
  constructor(options: IntegrationOutboxProcessorOptions);
  processBatch(batchSize: number): Promise<number>;
}

// 工具函数
function computeOutboxNextRetrySeconds(retryCount: number): number;
function readOutboxMaxRetryCount(): number;
function computeOutboxLagMs(occurredAt: string | Date): number | undefined;
```

### 6.4 投影处理器

```typescript
interface IntegrationOutboxProjectionProcessorOptions {
  processorName: string;
  consumerName: string;
  eventNames: string[];
  em: EntityManager;
  logger: OutboxLogger;
  handleEvent: (input: {
    row: PublishedIntegrationOutboxRow;
    envelope: OksaiIntegrationEvent;
  }) => Promise<void>;
}

class IntegrationOutboxProjectionProcessor {
  constructor(options: IntegrationOutboxProjectionProcessorOptions);
  processBatch(batchSize: number): Promise<number>;
}
```

### 6.5 订阅者

```typescript
interface IOksaiIntegrationEventSubscriber {
  readonly subscriberName: string;
  readonly eventName: string;
  readonly eventVersion?: number;
  readonly timeoutMs?: number;
  handle(input: {
    envelope: OksaiIntegrationEvent;
    logger: SubscriberLogger;
  }): Promise<void>;
}

// DI Token
const OKSAI_INTEGRATION_EVENT_SUBSCRIBER_TYPES: symbol;

// 分发器
class IntegrationEventSubscriberDispatcherService {
  dispatch(envelope: OksaiIntegrationEvent, logger: SubscriberLogger): Promise<void>;
}
```

### 6.6 Kafka 集成

```typescript
interface OksaiKafkaConfig {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  topic: string;
  groupId: string;
}

function parseKafkaConfig(configService: ConfigService): OksaiKafkaConfig;
function parseKafkaEnvConfig(): OksaiKafkaConfig; // @deprecated

function loadKafkaJs(): Promise<KafkaJsModuleLike>;

class KafkaIntegrationEventProducer {
  static fromEnv(options: KafkaIntegrationEventProducerOptions): Promise<KafkaIntegrationEventProducer | null>;
  start(): Promise<void>;
  stop(): Promise<void>;
  publish(envelope: OksaiIntegrationEvent): Promise<void>;
}

class KafkaIntegrationEventConsumer {
  static fromEnv(options: KafkaIntegrationEventConsumerOptions): Promise<KafkaIntegrationEventConsumer | null>;
  start(handler: (input: { envelope: OksaiIntegrationEvent }) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
}
```

### 6.7 Worker 工具

```typescript
interface PollingWorkerOptions {
  workerName: string;
  intervalMs?: number;
  batchSize?: number;
  enabled?: boolean;
  tick: (batchSize: number) => Promise<number | void>;
  onError?: (error: Error) => void;
  onIdle?: () => void;
}

function createPollingWorker(options: PollingWorkerOptions): {
  start(): void;
  stop(): Promise<void>;
  isRunning(): boolean;
};

// 环境变量读取
function readBooleanFromEnv(value: string | undefined, defaultValue: boolean): boolean;
function readOptionalBooleanFromEnv(value: string | undefined): boolean | undefined;
function readOptionalPositiveIntFromEnv(value: string | undefined): number | undefined;
```

### 6.8 上下文工具

```typescript
function withOksaiWorkerContext<T>(
  context: OksaiRequestContext,
  fn: () => Promise<T>
): Promise<T>;

function withOksaiWorkerContextFromJob<T>(
  fn: () => Promise<T>
): (job: WorkerJob) => Promise<T>;

interface WithOksaiWorkerContextFromJobOptions {
  keyMapping?: Record<string, string>;
}
```

### 6.9 指标

```typescript
interface StartOksaiMetricsOptions {
  port?: number;
  prefix?: string;
}

function startOksaiMetrics(options?: StartOksaiMetricsOptions): Promise<void>;
function getOksaiMetricsRecorder(): OksaiMetricsRecorder;
function resetOksaiMetrics(): void;

interface OksaiMetricsRecorder {
  incIntegrationEventProcessedTotal(labels: {
    mode: 'outbox' | 'projection';
    processor: string;
    eventName: string;
    result: 'success' | 'failed' | 'dedup_skip' | 'invalid_envelope';
  }): void;
  
  observeIntegrationEventLagMs(labels: {
    mode: 'outbox' | 'projection';
    processor: string;
    eventName: string;
    lagMs: number;
  }): void;
  
  observeIntegrationEventDurationMs(labels: {
    mode: 'outbox' | 'projection';
    processor: string;
    eventName: string;
    durationMs: number;
  }): void;
}
```

---

## 七、环境变量

| 变量名 | 说明 | 默认值 |
|:---|:---|:---|
| `KAFKA_ENABLED` | 是否启用 Kafka | `false` |
| `KAFKA_BROKERS` | Kafka Broker 列表（逗号分隔） | - |
| `KAFKA_CLIENT_ID` | Kafka Client ID | `oksai` |
| `KAFKA_INTEGRATION_TOPIC` | Kafka Topic | `oksai.integration-events` |
| `KAFKA_GROUP_ID` | Consumer Group ID | `oksai.integration-consumer` |
| `OKSAI_OUTBOX_MAX_RETRY_COUNT` | 最大重试次数 | `10` |
| `OUTBOX_MAX_RETRY_COUNT` | 最大重试次数（备选） | `10` |
| `WORKER_ENABLED` | Worker 启用开关 | `true` |
| `WORKER_INTERVAL_MS` | 轮询间隔（毫秒） | `1000` |
| `WORKER_BATCH_SIZE` | 批处理大小 | `100` |
| `INTEGRATION_EVENT_SUBSCRIBER_MAX_RETRY_COUNT` | 订阅者最大重试次数 | `20` |
| `INTEGRATION_EVENT_SUBSCRIBER_RETRY_BASE_SECONDS` | 订阅者重试基准秒数 | `5` |
| `INTEGRATION_EVENT_SUBSCRIBER_RETRY_MAX_SECONDS` | 订阅者重试最大秒数 | `300` |
| `OKSAI_METRICS_PORT` | Prometheus 指标端口 | `9090` |

---

## 八、测试覆盖

| 指标 | 覆盖率 |
|:---|:---|
| **Statements** | 56.15% |
| **Branches** | 45.94% |
| **Functions** | 62.4% |
| **Lines** | 57.18% |
| **Test Suites** | 13 passed |
| **Tests** | 78 passed |

**模块覆盖详情**：

| 模块 | Statements | 说明 |
|:---|:---|:---|
| `outbox-processor.ts` | 87.2% | 核心处理逻辑 |
| `subscriber-dispatcher.service.ts` | 100% | 订阅者分发 |
| `outbox-producer.ts` | 100% | 事件生产 |
| `outbox-envelope.ts` | 83.33% | 信封解析 |
| `polling-worker.ts` | 80.85% | Worker 基类 |
| `outbox-publisher.ts` | 80% | Kafka 发布 |
| `outbox-reaper.ts` | 79.06% | 僵尸清理 |

---

## 九、注意事项

1. **幂等性**：所有 `handleEvent` 实现必须支持重复执行
2. **租户隔离**：必须从 `envelope.tenantId` 获取租户，禁止忽略
3. **事务边界**：`insertIntegrationOutboxEvent` 必须与业务数据在同一事务
4. **Consumer 命名**：`consumerName` 必须稳定唯一，变更会导致重复处理
5. **重试策略**：指数退避，最大重试 10 次后进入 `dead` 状态
6. **Kafka 可选**：未配置 Kafka 时，事件仅存储在 Outbox
7. **指标监控**：生产环境建议启用 Prometheus 指标
8. **优雅关闭**：Worker 必须监听 `SIGTERM` 并调用 `stop()`
9. **分区键**：`partitionKey` 必须保证同一聚合的事件有序
10. **版本兼容**：`eventVersion` 变更时，订阅者应处理多版本

---

## 十、与其他模块集成

### 10.1 与 @oksai/contracts 集成

集成事件契约定义在 `@oksai/contracts`：

```typescript
import {
  type OksaiIntegrationEvent,
  parseOksaiIntegrationEvent,
} from '@oksai/contracts';
```

### 10.2 与 @oksai/context 集成

自动传递租户上下文：

```typescript
import { runWithOksaiContext } from '@oksai/context';
import { buildIntegrationEventFromCurrentContext } from '@oksai/eda';

await runWithOksaiContext({ tenantId: 't1', userId: 'u1' }, async () => {
  // 自动从 CLS 提取 tenantId
  const event = buildIntegrationEventFromCurrentContext({ ... });
});
```

### 10.3 与 @oksai/config 集成

通过 ConfigService 读取 Kafka 配置：

```typescript
import { parseKafkaConfig } from '@oksai/eda';

const kafkaConfig = parseKafkaConfig(configService);
```

### 10.4 与 @oksai/analytics 集成

投影处理器写入 ClickHouse：

```typescript
const projector = new IntegrationOutboxProjectionProcessor({
  processorName: 'analytics.projector',
  consumerName: 'analytics.events',
  eventNames: ['*'], // 所有事件
  em,
  logger,
  handleEvent: async ({ row, envelope }) => {
    await clickhouse.insert('events', {
      event_id: row.event_id,
      tenant_id: envelope.tenantId,
      event_name: envelope.eventName,
      event_version: envelope.eventVersion,
      payload: envelope.payload,
      occurred_at: envelope.occurredAt,
    });
  },
});
```

---

## 十一、常见问题

### Q1: 如何保证事件不丢失？

A: 使用 Transactional Outbox 模式，事件与业务数据原子写入，通过 `IntegrationOutboxProcessor` 可靠处理。

### Q2: 如何处理重复事件？

A: 通过 `integration_inbox_processed` 表实现幂等去重，`eventId + consumerName` 唯一。

### Q3: 事件处理失败怎么办？

A: 自动重试（指数退避），超过最大重试次数后进入 `dead` 状态，写入 `dead_letter` 表。

### Q4: 如何跨服务传递事件？

A: 启用 Kafka，通过 `OutboxPublisher` 发布到 Kafka，消费端使用 `KafkaIntegrationEventConsumer`。

### Q5: 如何监控事件处理？

A: 启用 Prometheus 指标，监控 `oksai_integration_event_processed_total` 和 `oksai_integration_event_lag_ms`。
