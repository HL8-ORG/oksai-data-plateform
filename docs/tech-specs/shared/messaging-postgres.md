# Messaging Postgres 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/messaging-postgres` 提供基于 PostgreSQL 的消息传递实现：

- **Outbox 模式**：可靠的出站消息发布
- **Inbox 模式**：幂等的入站消息处理
- **事务性消息**：与业务操作原子性保证

### 1.2 设计模式

| 模式 | 用途 |
|------|------|
| **Outbox** | 确保业务操作和消息发布的原子性 |
| **Inbox** | 确保消息的幂等处理 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/messaging-postgres/
├── lib/
│   ├── types.ts
│   ├── nest/
│   │   └── setup-messaging-postgres-module.ts
│   └── postgres/
│       ├── pg-outbox.ts
│       ├── pg-inbox.ts
│       ├── outbox-record.entity.ts
│       └── inbox-record.entity.ts
└── index.ts
```

### 2.2 Outbox/Inbox 流程

```
┌─────────────────────────────────────────────────────────────┐
│                     Outbox 模式                              │
└─────────────────────────────────────────────────────────────┘

Command Handler
      │
      │ 1. 业务操作
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Transaction                      │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ 业务表写入       │  │ Outbox 表写入                    │  │
│  │ INSERT INTO jobs│  │ INSERT INTO outbox_records       │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
      │
      │ 2. 后台轮询发送
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Message Publisher                         │
│  - 标记为 PROCESSING                                         │
│  - 发送到消息队列                                             │
│  - 标记为 PUBLISHED                                          │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                     Inbox 模式                               │
└─────────────────────────────────────────────────────────────┘

Message Consumer
      │
      │ 1. 检查是否已处理
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Inbox 表查询                              │
│  SELECT * FROM inbox_records WHERE event_id = ?              │
└─────────────────────────────────────────────────────────────┘
      │
      │ 未处理
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    处理消息                                   │
│  1. 标记为 PROCESSING                                        │
│  2. 执行业务逻辑                                             │
│  3. 标记为 PROCESSED                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 配置模块

```typescript
import { Module } from '@nestjs/common';
import { setupMessagingPostgresModule } from '@oksai/messaging-postgres';

@Module({
  imports: [
    setupMessagingPostgresModule({
      pool: dbPool,
      outbox: {
        tableName: 'outbox_records',
        pollInterval: 100,  // ms
        batchSize: 100,
      },
      inbox: {
        tableName: 'inbox_records',
        lockTimeout: 30000,  // ms
      },
    }),
  ],
})
export class AppModule {}
```

### 3.2 使用 Outbox

```typescript
import { PgOutbox } from '@oksai/messaging-postgres';

class CreateJobHandler {
  constructor(private readonly outbox: PgOutbox) {}

  async handle(command: CreateJobCommand) {
    // 在事务中
    await this.db.transaction(async (tx) => {
      // 1. 业务操作
      const job = Job.create(command);
      await this.jobRepository.save(job, tx);

      // 2. 写入 Outbox（同一事务）
      await this.outbox.append(
        {
          eventId: generateId(),
          eventType: 'job.created',
          aggregateId: job.id.toValue(),
          payload: { title: job.title },
        },
        tx
      );
    });

    // Outbox 后台进程会自动发送
  }
}
```

### 3.3 使用 Inbox

```typescript
import { PgInbox } from '@oksai/messaging-postgres';

class JobEventConsumer {
  constructor(private readonly inbox: PgInbox) {}

  async handle(message: IntegrationEvent) {
    // 幂等处理
    const processed = await this.inbox.isProcessed(message.eventId);
    if (processed) {
      return;  // 已处理，跳过
    }

    // 标记处理中
    await this.inbox.markProcessing(message.eventId);

    try {
      // 业务处理
      await this.processEvent(message);

      // 标记已处理
      await this.inbox.markProcessed(message.eventId);
    } catch (error) {
      // 标记失败
      await this.inbox.markFailed(message.eventId, error.message);
      throw error;
    }
  }
}
```

---

## 四、API 参考

### 4.1 OutboxRecord

```typescript
interface OutboxRecord {
  id: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  publishedAt?: Date;
}
```

### 4.2 InboxRecord

```typescript
interface InboxRecord {
  id: string;
  eventId: string;
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
}
```

### 4.3 PgOutbox

```typescript
interface OutboxMessage {
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

class PgOutbox {
  /**
   * 追加消息到 Outbox
   */
  append(message: OutboxMessage, tx?: Transaction): Promise<void>;

  /**
   * 批量追加
   */
  appendBatch(messages: OutboxMessage[], tx?: Transaction): Promise<void>;

  /**
   * 获取待发送消息
   */
  getPending(batchSize: number): Promise<OutboxRecord[]>;

  /**
   * 标记为已发送
   */
  markPublished(id: string): Promise<void>;

  /**
   * 标记为失败
   */
  markFailed(id: string, error: string): Promise<void>;
}
```

### 4.4 PgInbox

```typescript
class PgInbox {
  /**
   * 检查是否已处理
   */
  isProcessed(eventId: string): Promise<boolean>;

  /**
   * 标记处理中
   */
  markProcessing(eventId: string, message: IntegrationEvent): Promise<void>;

  /**
   * 标记已处理
   */
  markProcessed(eventId: string): Promise<void>;

  /**
   * 标记失败
   */
  markFailed(eventId: string, error: string): Promise<void>;

  /**
   * 获取待处理消息
   */
  getPending(batchSize: number): Promise<InboxRecord[]>;
}
```

---

## 五、数据库表

### 5.1 outbox_records 表

```sql
CREATE TABLE outbox_records (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  retry_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX idx_outbox_status ON outbox_records (status);
CREATE INDEX idx_outbox_created ON outbox_records (created_at);
```

### 5.2 inbox_records 表

```sql
CREATE TABLE inbox_records (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  retry_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_inbox_status ON inbox_records (status);
CREATE INDEX idx_inbox_event ON inbox_records (event_id);
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 79.41% |
| Functions | 100% |
| Lines | 100% |

---

## 七、最佳实践

### 7.1 消息幂等性

```typescript
// 使用 eventId 作为幂等键
await this.inbox.markProcessing(message.eventId);

// 如果处理失败，可以重试
// 状态会从 PROCESSING 回到 PENDING（超时后）
```

### 7.2 重试策略

```typescript
// 在消费者中实现重试逻辑
const MAX_RETRIES = 3;

async function processWithRetry(message: InboxRecord) {
  if (message.retryCount >= MAX_RETRIES) {
    // 超过最大重试次数，放入死信队列
    await this.deadLetterQueue.add(message);
    return;
  }

  // 正常处理
  await this.processMessage(message);
}
```

### 7.3 监控和告警

```typescript
// 定期检查积压消息
const pending = await this.outbox.getPending(1);
if (pending.length > 1000) {
  await this.alerting.warn('Outbox 积压过多');
}
```
