# Messaging 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/messaging` 提供消息传递抽象，支持：

- **消息发布**：发布领域事件和集成事件
- **消息订阅**：订阅事件并处理
- **消息接口**：与具体消息中间件解耦

### 1.2 设计目标

- 抽象消息传递细节
- 支持多种消息中间件（Postgres, RabbitMQ, Kafka）
- 松耦合的发布/订阅模式

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/messaging/
├── lib/
│   ├── message-bus.port.ts        # 消息总线端口
│   ├── message.types.ts           # 消息类型定义
│   └── index.ts
├── spec/
│   └── ...
└── index.ts
```

### 2.2 消息传递流程

```
┌─────────────────────────────────────────────────────────────┐
│                   Domain Layer                               │
│  AggregateRoot.domainEvents                                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ 发布领域事件
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  CommandHandler → EventBus.publish(event)                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   MessageBus (Port)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ publish(topic, message)                              │   │
│  │ subscribe(topic, handler)                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Adapter Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Postgres        │  │ RabbitMQ        │  (可扩展)        │
│  │ Adapter         │  │ Adapter         │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、核心概念

### 3.1 消息类型

```typescript
// 领域事件（内部）
interface DomainEvent {
  aggregateId: string;
  eventType: string;
  payload: unknown;
  occurredAt: Date;
}

// 集成事件（跨服务）
interface IntegrationEvent {
  eventId: string;
  eventType: string;
  payload: unknown;
  occurredAt: Date;
  metadata: {
    source: string;
    correlationId?: string;
  };
}

// 消息封装
interface Message<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  headers: Record<string, string>;
  timestamp: number;
}
```

### 3.2 Topic 命名约定

| 类型 | 格式 | 示例 |
|------|------|------|
| 领域事件 | `{aggregate}.{event}` | `job.created` |
| 集成事件 | `{service}.{aggregate}.{event}` | `platform.job.completed` |

---

## 四、使用方式

### 4.1 发布消息

```typescript
import { IMessageBus } from '@oksai/messaging';

class JobCommandHandler {
  constructor(private readonly messageBus: IMessageBus) {}

  async handle(command: CreateJobCommand): Promise<void> {
    // 创建聚合
    const job = Job.create(command);

    // 发布领域事件
    for (const event of job.domainEvents) {
      await this.messageBus.publish(
        `job.${event.eventType}`,
        this.toMessage(event)
      );
    }

    job.clearEvents();
  }
}
```

### 4.2 订阅消息

```typescript
import { IMessageBus, MessageHandler } from '@oksai/messaging';

class JobProjector {
  constructor(messageBus: IMessageBus) {
    messageBus.subscribe('job.created', this.onJobCreated.bind(this));
    messageBus.subscribe('job.completed', this.onJobCompleted.bind(this));
  }

  private async onJobCreated(message: Message): Promise<void> {
    const event = message.payload as JobCreatedEvent;
    await this.readModel.insert({
      id: event.aggregateId,
      title: event.payload.title,
      status: 'pending',
    });
  }

  private async onJobCompleted(message: Message): Promise<void> {
    const event = message.payload as JobCompletedEvent;
    await this.readModel.update(event.aggregateId, {
      status: 'completed',
      completedAt: event.occurredAt,
    });
  }
}
```

---

## 五、API 参考

### 5.1 IMessageBus

```typescript
interface IMessageBus {
  /**
   * 发布消息到指定 topic
   */
  publish<T>(topic: string, message: Message<T>): Promise<void>;

  /**
   * 订阅 topic
   */
  subscribe(topic: string, handler: MessageHandler): Promise<void>;

  /**
   * 取消订阅
   */
  unsubscribe(topic: string, handler: MessageHandler): Promise<void>;
}

interface MessageHandler {
  (message: Message): Promise<void>;
}
```

### 5.2 Message

```typescript
interface Message<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  headers: Record<string, string>;
  timestamp: number;
}
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 97.14% |
| Branches | 83.33% |
| Functions | 93.33% |
| Lines | 97.14% |

---

## 七、消息中间件适配器

### 7.1 Postgres 适配器

`@oksai/messaging-postgres` 提供基于 PostgreSQL 的消息实现：

```typescript
import { PostgresMessageBus } from '@oksai/messaging-postgres';

const messageBus = new PostgresMessageBus(pool, {
  tableName: 'outbox_messages',
  pollInterval: 100,
});
```

### 7.2 扩展其他适配器

实现 `IMessageBus` 接口即可：

```typescript
class RabbitMQMessageBus implements IMessageBus {
  async publish<T>(topic: string, message: Message<T>): Promise<void> {
    // RabbitMQ 实现
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    // RabbitMQ 实现
  }

  async unsubscribe(topic: string, handler: MessageHandler): Promise<void> {
    // RabbitMQ 实现
  }
}
```

---

## 八、最佳实践

### 8.1 消息幂等性

消费者应处理重复消息：

```typescript
async onJobCreated(message: Message): Promise<void> {
  // 使用 UPSERT 或检查是否已处理
  const existing = await this.readModel.findById(message.payload.id);
  if (existing) {
    return; // 已处理，跳过
  }

  await this.readModel.insert(message.payload);
}
```

### 8.2 消息顺序

- 同一聚合的事件应保持顺序
- 使用分区键保证顺序

### 8.3 错误处理

```typescript
async subscribe(topic: string, handler: MessageHandler): Promise<void> {
  this.messageBus.subscribe(topic, async (message) => {
    try {
      await handler(message);
    } catch (error) {
      // 记录错误，重试或放入死信队列
      this.logger.error(`处理消息失败: ${message.id}`, error);
      throw error;
    }
  });
}
```
