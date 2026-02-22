# Kernel 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/kernel` 是 DDD（领域驱动设计）核心构建块的基础设施，提供：

- **聚合根**：`AggregateRoot` 基类，支持领域事件
- **实体**：`Entity` 基类，支持唯一标识
- **值对象**：`ValueObject` 基类，支持不可变性和相等性比较
- **唯一标识**：`UniqueEntityID` 用于生成和管理实体 ID
- **结果类型**：`Result` 用于函数式错误处理

### 1.2 设计原则

- **纯净领域**：无外部框架依赖
- **不可变性**：值对象和实体属性不可变
- **事件溯源支持**：聚合根自动追踪领域事件

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/kernel/
├── lib/
│   ├── aggregate-root.aggregate.ts  # 聚合根基类
│   ├── entity.ts                    # 实体基类
│   ├── value-object.vo.ts           # 值对象基类
│   ├── unique-entity-id.vo.ts       # 唯一标识
│   ├── result.ts                    # Result 类型
│   └── domain-event.base.ts         # 领域事件基类
├── spec/
│   ├── aggregate-root.spec.ts
│   ├── entity.spec.ts
│   ├── value-object.spec.ts
│   ├── unique-entity-id.spec.ts
│   └── result.spec.ts
└── index.ts
```

### 2.2 类层次结构

```
                    ValueObject
                        │
                        ▼
                   Entity<T>
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
      AggregateRoot            普通实体
   (domainEvents[])          (无领域事件)
```

---

## 三、核心组件

### 3.1 ValueObject（值对象）

值对象是描述事物属性的无身份对象，通过其属性值定义相等性。

```typescript
import { ValueObject } from '@oksai/kernel';

interface EmailProps {
  value: string;
}

class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(email: string): Result<Email> {
    if (!email || !email.includes('@')) {
      return Result.fail('无效的邮箱地址');
    }
    return Result.ok(new Email({ value: email.toLowerCase() }));
  }
}

// 使用
const emailResult = Email.create('user@example.com');
if (emailResult.isOk()) {
  const email = emailResult.value;
  console.log(email.value); // 'user@example.com'
}
```

**特性**：
- 不可变：创建后属性不可修改
- 值相等性：通过 `equals()` 比较属性值

### 3.2 UniqueEntityID（唯一标识）

为实体提供全局唯一标识。

```typescript
import { UniqueEntityID } from '@oksai/kernel';

// 自动生成 ID
const id1 = new UniqueEntityID();
console.log(id1.toValue()); // 'uuid-string'

// 从现有值创建
const id2 = new UniqueEntityID('user-123');
console.log(id2.toValue()); // 'user-123'
console.log(id2.toString()); // 'user-123'

// 比较
id1.equals(id2); // false
```

### 3.3 Entity（实体）

实体具有唯一标识，通过 ID 而非属性值定义相等性。

```typescript
import { Entity, UniqueEntityID, Result } from '@oksai/kernel';

interface UserProps {
  email: Email;
  name: string;
  createdAt: Date;
}

class User extends Entity<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  static create(props: UserProps, id?: UniqueEntityID): Result<User> {
    // 验证逻辑
    if (!props.name || props.name.length < 2) {
      return Result.fail('名称至少需要 2 个字符');
    }
    return Result.ok(new User(props, id));
  }
}
```

### 3.4 AggregateRoot（聚合根）

聚合根是聚合的根实体，负责维护聚合内的一致性，并发出领域事件。

```typescript
import { AggregateRoot, UniqueEntityID, DomainEvent } from '@oksai/kernel';

interface JobProps {
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  items: JobItem[];
}

// 领域事件
class JobCreatedEvent implements DomainEvent {
  public readonly occurredAt: Date;
  
  constructor(
    public readonly aggregateId: UniqueEntityID,
    public readonly title: string
  ) {
    this.occurredAt = new Date();
  }
}

class Job extends AggregateRoot<JobProps> {
  private constructor(props: JobProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get title(): string {
    return this.props.title;
  }

  get status(): string {
    return this.props.status;
  }

  static create(props: JobProps, id?: UniqueEntityID): Result<Job> {
    const job = new Job(props, id);
    
    // 发出领域事件（仅新建时）
    if (!id) {
      job.addDomainEvent(new JobCreatedEvent(job.id, job.title));
    }
    
    return Result.ok(job);
  }

  start(): void {
    if (this.props.status !== 'pending') {
      throw new Error('只有待处理状态的任务可以启动');
    }
    this.props.status = 'running';
    // 可以添加更多领域事件
  }
}

// 使用
const jobResult = Job.create({ title: '数据导入', status: 'pending', items: [] });
if (jobResult.isOk()) {
  const job = jobResult.value;
  console.log(job.domainEvents); // [JobCreatedEvent]
  job.clearEvents(); // 处理后清除事件
}
```

### 3.5 Result（结果类型）

用于函数式错误处理，避免异常。

```typescript
import { Result } from '@oksai/kernel';

// 创建成功结果
const success = Result.ok({ id: '123', name: 'test' });

// 创建失败结果
const failure = Result.fail('操作失败');

// 使用
function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return Result.fail('除数不能为零');
  }
  return Result.ok(a / b);
}

const result = divide(10, 2);
if (result.isOk()) {
  console.log(result.value); // 5
} else {
  console.log(result.error); // 错误消息
}

// 链式操作
result
  .map(value => value * 2)
  .map(value => `结果是 ${value}`);
```

---

## 四、API 参考

### 4.1 ValueObject

```typescript
abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T);

  equals(vo?: ValueObject<T>): boolean;

  getProps(): T;

  clone(): ValueObject<T>;
}
```

### 4.2 UniqueEntityID

```typescript
class UniqueEntityID {
  constructor(id?: string | number);

  toValue(): string | number;
  toString(): string;
  equals(id?: UniqueEntityID): boolean;
}
```

### 4.3 Entity

```typescript
abstract class Entity<T> {
  protected readonly _id: UniqueEntityID;
  protected readonly props: T;

  protected constructor(props: T, id?: UniqueEntityID);

  get id(): UniqueEntityID;
  equals(entity?: Entity<T>): boolean;
}
```

### 4.4 AggregateRoot

```typescript
abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[];

  get domainEvents(): DomainEvent[];
  addDomainEvent(event: DomainEvent): void;
  clearEvents(): void;
}

interface DomainEvent {
  aggregateId: UniqueEntityID;
  occurredAt: Date;
}
```

### 4.5 Result

```typescript
class Result<T, E = Error> {
  static ok<T>(value: T): Result<T>;
  static fail<E>(error: E): Result<never, E>;

  isOk(): boolean;
  isFail(): boolean;
  get value(): T;
  get error(): E;

  map<U>(fn: (value: T) => U): Result<U, E>;
  mapError<F>(fn: (error: E) => F): Result<T, F>;
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
}
```

---

## 五、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 94.23% |
| Branches | 98.11% |
| Functions | 91.83% |
| Lines | 94.23% |

---

## 六、最佳实践

### 6.1 值对象

- 用于描述性属性（Email, Money, Address）
- 保持不可变
- 包含自验证逻辑

### 6.2 实体

- 用于有唯一标识的概念（User, Order, Job）
- ID 在整个生命周期内不变
- 通过 ID 而非属性判断相等性

### 6.3 聚合根

- 作为聚合的入口点
- 维护聚合内一致性
- 通过领域事件与外部通信
- 事件处理后调用 `clearEvents()`

### 6.4 Result

- 用于可能失败的操作
- 避免抛出异常用于业务逻辑
- 链式处理提高可读性
