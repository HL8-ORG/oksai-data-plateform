# EDA 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/eda`（Event-Driven Architecture）实现事件驱动架构的核心组件：

- **事件总线**：发布-订阅模式的事件分发
- **集成事件**：跨边界通信的事件封装
- **事件处理器**：统一的处理接口

### 1.2 EDA vs 领域事件

| 类型 | 作用域 | 特点 |
|------|--------|------|
| **领域事件** | 领域内部 | 表达业务发生的事实 |
| **集成事件** | 跨边界 | 用于服务间通信 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/eda/
├── lib/
│   ├── event-bus.ts           # 事件总线
│   ├── integration-event.ts   # 集成事件
│   └── event-handler.ts       # 事件处理器接口
├── spec/
│   └── eda.spec.ts
└── index.ts
```

### 2.2 事件驱动流程

```
┌─────────────────────────────────────────────────────────────┐
│                   Domain Layer                               │
│  AggregateRoot.domainEvents (领域事件)                       │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ 转换
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  将领域事件转换为 IntegrationEvent                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ EventBus.publish()
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      EventBus                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ eventName → Set<IEventHandler>                       │   │
│  │                                                       │   │
│  │ 'JobCreated' → [Handler1, Handler2, ...]             │   │
│  │ 'JobCompleted' → [Handler3, ...]                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ 并行调用所有处理器
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Event Handlers                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Projector   │  │ Notifier    │  │ Sync to External    │  │
│  │ (更新读模型) │  │ (发送通知)  │  │ (同步外部系统)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、核心组件

### 3.1 IntegrationEvent

集成事件用于跨边界通信：

```typescript
import { IntegrationEvent } from '@oksai/eda';

// 创建集成事件
const event = IntegrationEvent.create({
  eventName: 'JobCreated',
  aggregateId: 'job-123',
  payload: {
    title: '数据导入任务',
    tenantId: 'tenant-456',
    status: 'pending',
  },
});

// 事件属性
console.log(event.eventId);      // '1708550400000-x7k2m9q'
console.log(event.eventName);    // 'JobCreated'
console.log(event.aggregateId);  // 'job-123'
console.log(event.occurredAt);   // Date
console.log(event.payload);      // { title, tenantId, status }
```

### 3.2 IEventHandler

事件处理器接口：

```typescript
import { IEventHandler, IIntegrationEvent } from '@oksai/eda';

// 实现事件处理器
class JobCreatedHandler implements IEventHandler {
  async handle(event: IIntegrationEvent): Promise<void> {
    console.log(`处理事件: ${event.eventName}`);
    console.log(`聚合ID: ${event.aggregateId}`);
    console.log(`负载:`, event.payload);
  }
}

// 带类型的事件处理器
interface JobCreatedPayload {
  title: string;
  tenantId: string;
}

class TypedJobCreatedHandler implements IEventHandler<IIntegrationEvent<JobCreatedPayload>> {
  async handle(event: IIntegrationEvent<JobCreatedPayload>): Promise<void> {
    // payload 已类型化
    console.log(event.payload.title);
    console.log(event.payload.tenantId);
  }
}
```

### 3.3 EventBus

事件总线实现发布-订阅模式：

```typescript
import { EventBus, IntegrationEvent } from '@oksai/eda';

const eventBus = new EventBus();

// 订阅事件
const handler = {
  async handle(event) {
    console.log('收到事件:', event.eventName);
  }
};

eventBus.subscribe('JobCreated', handler);

// 发布事件
const event = IntegrationEvent.create({
  eventName: 'JobCreated',
  aggregateId: 'job-123',
  payload: { title: '新任务' },
});

await eventBus.publish(event);

// 取消订阅
eventBus.unsubscribe('JobCreated', handler);
```

---

## 四、使用方式

### 4.1 基本使用

```typescript
import { EventBus, IntegrationEvent, IEventHandler } from '@oksai/eda';

// 创建事件总线
const eventBus = new EventBus();

// 定义处理器
class EmailNotificationHandler implements IEventHandler {
  async handle(event) {
    if (event.eventName === 'UserRegistered') {
      await this.sendWelcomeEmail(event.payload.email);
    }
  }

  private async sendWelcomeEmail(email: string) {
    // 发送邮件逻辑
  }
}

// 订阅
eventBus.subscribe('UserRegistered', new EmailNotificationHandler());

// 发布
const event = IntegrationEvent.create({
  eventName: 'UserRegistered',
  aggregateId: 'user-123',
  payload: { email: 'user@example.com', name: '张三' },
});

await eventBus.publish(event);
```

### 4.2 多处理器

```typescript
// 一个事件可以有多个处理器
eventBus.subscribe('OrderCreated', new InventoryHandler());
eventBus.subscribe('OrderCreated', new PaymentHandler());
eventBus.subscribe('OrderCreated', new NotificationHandler());

// 发布时所有处理器并行执行
await eventBus.publish(orderCreatedEvent);
```

### 4.3 批量发布

```typescript
const events = [
  IntegrationEvent.create({ eventName: 'ItemAdded', aggregateId: 'cart-1', payload: { ... } }),
  IntegrationEvent.create({ eventName: 'ItemAdded', aggregateId: 'cart-1', payload: { ... } }),
  IntegrationEvent.create({ eventName: 'CartUpdated', aggregateId: 'cart-1', payload: { ... } }),
];

// 按顺序发布所有事件
await eventBus.publishAll(events);
```

### 4.4 NestJS 集成

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, IEventHandler } from '@oksai/eda';

@Injectable()
export class JobCreatedHandler implements IEventHandler, OnModuleInit {
  constructor(private readonly eventBus: EventBus) {}

  onModuleInit() {
    this.eventBus.subscribe('JobCreated', this);
  }

  async handle(event): Promise<void> {
    // 处理逻辑
  }
}
```

---

## 五、API 参考

### 5.1 IIntegrationEvent

```typescript
interface IIntegrationEvent<T = Record<string, unknown>> {
  eventId: string;
  eventName: string;
  aggregateId: string;
  payload: T;
  occurredAt: Date;
}
```

### 5.2 IntegrationEvent

```typescript
class IntegrationEvent implements IIntegrationEvent {
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

### 5.3 IEventHandler

```typescript
interface IEventHandler<T extends IIntegrationEvent = IIntegrationEvent> {
  handle(event: T): Promise<void>;
}
```

### 5.4 EventBus

```typescript
class EventBus {
  /**
   * 订阅事件
   */
  subscribe(eventName: string, handler: IEventHandler): void;

  /**
   * 取消订阅
   */
  unsubscribe(eventName: string, handler: IEventHandler): void;

  /**
   * 发布事件（并行调用所有处理器）
   */
  publish(event: IIntegrationEvent): Promise<void>;

  /**
   * 批量发布事件（按顺序）
   */
  publishAll(events: IIntegrationEvent[]): Promise<void>;

  /**
   * 检查是否有处理器
   */
  hasHandler(eventName: string): boolean;

  /**
   * 获取处理器数量
   */
  handlerCount(eventName: string): number;

  /**
   * 清除所有处理器
   */
  clear(): void;
}
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 91.66% |
| Functions | 100% |
| Lines | 100% |

---

## 七、注意事项

1. **并行处理**：同一事件的所有处理器并行执行，注意竞态条件
2. **错误处理**：处理器应自行处理异常，避免影响其他处理器
3. **幂等性**：处理器应设计为幂等的，处理重复事件不会产生副作用
4. **事件顺序**：`publishAll` 保证顺序，单个 `publish` 不保证

---

## 八、与其他模块集成

### 8.1 与 @oksai/event-store 集成

```typescript
// 命令处理器中发布集成事件
class CreateJobHandler implements ICommandHandler<CreateJobCommand> {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateJobCommand): Promise<void> {
    const job = Job.create(command);
    
    // 保存到事件存储
    await this.eventStore.appendEvents(stream, job.domainEvents, 0);
    
    // 发布集成事件
    for (const domainEvent of job.domainEvents) {
      const integrationEvent = IntegrationEvent.create({
        eventName: domainEvent.eventType,
        aggregateId: domainEvent.aggregateId,
        payload: domainEvent.payload,
      });
      await this.eventBus.publish(integrationEvent);
    }
    
    job.clearEvents();
  }
}
```

### 8.2 与 @oksai/messaging 集成

```typescript
// 通过消息总线发布到外部系统
class ExternalSyncHandler implements IEventHandler {
  constructor(private readonly messageBus: IMessageBus) {}

  async handle(event: IIntegrationEvent): Promise<void> {
    await this.messageBus.publish(event.eventName, {
      id: event.eventId,
      payload: event.payload,
      timestamp: event.occurredAt.getTime(),
    });
  }
}
```

### 8.3 与 @oksai/analytics 集成

```typescript
// 投影器更新分析读模型
class JobAnalyticsProjector implements IEventHandler {
  constructor(private readonly clickhouse: ClickHouseClient) {}

  async handle(event: IIntegrationEvent): Promise<void> {
    if (event.eventName === 'JobCreated') {
      await this.clickhouse.insert('jobs', {
        id: event.aggregateId,
        tenant_id: event.payload.tenantId,
        title: event.payload.title,
        status: 'pending',
        created_at: event.occurredAt,
      });
    }
  }
}
```
