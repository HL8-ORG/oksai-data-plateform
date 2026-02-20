# 共享模块（Shared Kernel）命名规范

[返回目录](./spec.md) | [上一章：接口层](./spec-05-interface.md)

---

## 文件命名规范

| 类型 | 文件命名模式 | 示例 |
|:---|:---|:---|
| 基础抽象类 | `[name].base.ts` | `aggregate-root.base.ts` |
| 常量 | `[name].constants.ts` | `job-status.constants.ts` |
| 枚举 | `[name].enum.ts` | `job-status.enum.ts` |
| 类型别名 | `[name].types.ts` | `common.types.ts` |
| 工具函数 | `[name].utils.ts` | `date.utils.ts` |
| 接口 | `[name].interface.ts` | `repository.interface.ts` |
| 异常类 | `[name].exception.ts` | `domain.exception.ts` |
| Result 类型 | `result.types.ts` | `result.types.ts` |

---

## 一、基础抽象类

```typescript
// ✅ 正确
// 文件名: aggregate-root.base.ts
export abstract class AggregateRoot<TEvent extends DomainEvent = DomainEvent> { }
// 文件名: entity.base.ts
export abstract class Entity<TId = string> { }
// 文件名: value-object.base.ts
export abstract class ValueObject<TProps> { }
// 文件名: domain-event.base.ts
export abstract class DomainEvent<TPayload = unknown> { }
// 文件名: integration-event.base.ts
export abstract class IntegrationEvent<TPayload = unknown> { }

// ❌ 错误
export abstract class AggregateRootBase { }  // 冗余
```

### 1.1 基础类最佳实践

```typescript
// ✅ 正确 - 文件名: aggregate-root.base.ts
/**
 * 聚合根基类
 * 
 * @business-rule 管理领域事件集合
 * @business-rule 提供事件溯源支持
 */
export abstract class AggregateRoot<TEvent extends DomainEvent = DomainEvent> {
  protected _domainEvents: TEvent[] = [];

  /**
   * 应用变更并记录事件
   */
  protected applyChange(event: TEvent): void {
    this._domainEvents.push(event);
    this.apply(event);
  }

  /**
   * 获取未提交的领域事件
   */
  get domainEvents(): TEvent[] {
    return [...this._domainEvents];
  }

  /**
   * 清除已提交的领域事件
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * 从事件流重建聚合（事件溯源）
   */
  static rehydrate<T extends AggregateRoot>(
    this: new () => T,
    events: DomainEvent[]
  ): T {
    const aggregate = new this();
    events.forEach(event => aggregate.apply(event));
    return aggregate;
  }

  /**
   * 应用事件的具体实现（子类实现）
   */
  protected abstract apply(event: TEvent): void;
}
```

**命名模式**：
- 文件：`[name].base.ts`
- 类：`PascalCase`，无后缀

---

## 二、常量

```typescript
// ✅ 正确 - 文件名: job-status.constants.ts
export const JOB_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

// 文件名: pagination.constants.ts
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

// 文件名: http-status.constants.ts
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404
} as const;

// ❌ 错误
export const jobStatus = { ... };  // 应使用 UPPER_SNAKE_CASE
```

**命名模式**：
- 文件：`[业务概念].constants.ts`
- 变量：`UPPER_SNAKE_CASE`（大写蛇形命名）

---

## 三、枚举

```typescript
// ✅ 正确 - 文件名: job-status.enum.ts
/**
 * 任务状态枚举
 * 
 * @business-rule 使用字符串值便于调试和日志
 */
export enum JobStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// 文件名: tenant-tier.enum.ts
export enum TenantTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

// ❌ 避免 - 使用数字值（不便于调试）
export enum JobStatus {
  Draft = 0,
  Submitted = 1
}
```

### 3.1 枚举最佳实践

```typescript
// ✅ 正确 - 枚举与类型配合
// 文件名: job-status.enum.ts
export enum JobStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// 类型别名
export type JobStatusType = `${JobStatus}`;

// 或使用 const assertions（推荐用于简单场景）
// 文件名: job-status.types.ts
export const JobStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

export type JobStatus = typeof JobStatus[keyof typeof JobStatus];
```

**命名模式**：
- 文件：`[业务概念].enum.ts`
- 枚举名：`PascalCase`
- 枚举值：`UPPER_SNAKE_CASE`

---

## 四、类型别名

```typescript
// ✅ 正确 - 文件名: common.types.ts
// 基本类型别名
export type JobId = string;
export type TenantId = string;
export type UserId = string;
export type Email = string;

// 复杂类型别名
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type Maybe<T> = T | null | undefined;

// 联合类型
export type JobStatus = 'draft' | 'submitted' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentProvider = 'stripe' | 'paypal' | 'alipay';

// ❌ 错误
export type jobStatus = ...;  // 应使用 PascalCase
```

**命名模式**：
- 文件：`[用途].types.ts`
- 类型：`PascalCase`

---

## 五、泛型参数命名

```typescript
// ✅ 正确 - 通用泛型参数
export class Repository<TEntity> { }
export class Mapper<TDomain, TPersistence> { }
export class Result<TValue, TError = Error> { }
export class Event<TPayload = unknown> { }

// ✅ 正确 - 特定泛型参数
export interface IRepository<TAggregate extends AggregateRoot> { }
export interface ICommandHandler<TCommand extends ICommand> { }
export interface IQueryHandler<TQuery extends IQuery, TResult> { }
export interface IValidator<TInput> { }

// ✅ 正确 - 多个泛型参数
export class Either<TLeft, TRight> { }
export class PagedResult<TItem> { }
export class ApiResponse<TData, TMeta = unknown> { }
```

### 5.1 常用泛型参数前缀

| 前缀 | 用途 | 示例 |
|:---|:---|:---|
| `T` | 通用类型 | `T`, `TValue`, `TResult` |
| `TEntity` | 实体类型 | `TEntity`, `TAggregate` |
| `TDto` | DTO 类型 | `TDto`, `TRequest`, `TResponse` |
| `TProps` | 属性类型 | `TProps`, `TData` |
| `TInput` | 输入类型 | `TInput`, `TCommand`, `TQuery` |
| `TOutput` | 输出类型 | `TOutput`, `TResult`, `TResponse` |
| `TError` | 错误类型 | `TError`, `TException` |
| `K`, `V` | 键值对 | `Map<K, V>` |

**命名模式**：`T` + `PascalCase` 描述（如 `TEntity`, `TResult`）

---

## 六、工具函数

```typescript
// ✅ 正确 - 文件名: date.utils.ts
export const formatDate = (date: Date): string => { };
export const parseDate = (value: string): Date => { };

// 文件名: pagination.utils.ts
export const calculatePagination = (page: number, limit: number) => { };
export const toPagedResult = <T>(items: T[], total: number): PagedResult<T> => { };

// 文件名: id.utils.ts
export const generateJobId = (): string => { };
export const generateUuid = (): string => { };

// ❌ 错误
export const FormatDate = ...;  // 应使用 camelCase
```

### 6.1 工具函数分类命名

```typescript
// ✅ 正确 - 断言函数（返回 boolean）
export const isValidEmail = (email: string): boolean => { };
export const hasPermission = (user: User, permission: string): boolean => { };
export const canAccess = (resource: Resource, user: User): boolean => { };

// ✅ 正确 - 转换函数
export const toDateString = (date: Date): string => { };
export const toDomainEntity = (persistence: PersistenceModel): DomainEntity => { };

// ✅ 正确 - 创建函数
export const createUuid = (): string => { };
export const createLogger = (context: string): ILogger => { };

// ✅ 正确 - 解析函数
export const parseQueryString = (query: string): Record<string, string> => { };
export const parseEnvVariable = (value: string | undefined, defaultValue: string): string => { };
```

**命名模式**：
- 文件：`[用途].utils.ts`
- 函数：`camelCase`，动词开头

---

## 七、接口（Interface）

### 7.1 接口命名规范

```typescript
// ✅ 正确 - 使用 I 前缀（本项目推荐）
// 文件名: repository.interface.ts
export interface IRepository<T> { }
// 文件名: event-bus.interface.ts
export interface IEventBus { }
// 文件名: logger.interface.ts
export interface ILogger { }
```

### 7.2 接口类型区分

```typescript
// ✅ 正确 - 能力接口（-able 后缀）
// 文件名: serializable.interface.ts
export interface Serializable<T> { }
// 文件名: comparable.interface.ts
export interface Comparable<T> { }

// ✅ 正确 - 配置接口（Config/Options 后缀）
// 文件名: database-config.interface.ts
export interface DatabaseConfig { }
// 文件名: kafka-options.interface.ts
export interface KafkaOptions { }

// ✅ 正确 - 数据接口（Data/Props 后缀）
// 文件名: job-data.interface.ts
export interface JobData { }
// 文件名: create-job-props.interface.ts
export interface CreateJobProps { }

// ✅ 正确 - 回调接口（Handler/Callback 后缀）
// 文件名: event-handler.interface.ts
export interface EventHandler<T> { }
// 文件名: callback.interface.ts
export interface SuccessCallback<T> { }
```

> **建议**：团队应统一选择 `I` 前缀或无前缀风格，本项目推荐使用 `I` 前缀。

**命名模式**：
- 文件：`[名称].interface.ts`
- 接口：`I[名称]` 或 `[名称]`

---

## 八、错误类

```typescript
// ✅ 正确 - 领域异常
// 文件名: domain.exception.ts
export class DomainException extends Error { }
// 文件名: job.domain-exception.ts
export class JobDomainException extends DomainException { }

// ✅ 正确 - 应用异常
// 文件名: application.exception.ts
export class ApplicationException extends Error { }
// 文件名: validation.exception.ts
export class ValidationException extends ApplicationException { }
// 文件名: not-found.exception.ts
export class NotFoundException extends ApplicationException { }

// ✅ 正确 - 基础设施异常
// 文件名: infrastructure.exception.ts
export class InfrastructureException extends Error { }
// 文件名: database-connection.exception.ts
export class DatabaseConnectionException extends InfrastructureException { }

// ❌ 错误
export class JobError { }  // 应使用 Exception 后缀
```

### 8.1 异常类最佳实践

```typescript
// ✅ 正确 - 文件名: domain.exception.ts
/**
 * 领域异常基类
 */
export abstract class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 文件名: concurrency.exception.ts
/**
 * 并发冲突异常
 * 
 * @business-rule 乐观锁冲突时抛出
 */
export class ConcurrencyException extends DomainException {
  constructor(
    streamId: string,
    expectedVersion: number,
    actualVersion: number
  ) {
    super(
      `并发冲突：流 ${streamId} 期望版本 ${expectedVersion}，实际版本 ${actualVersion}`,
      'CONCURRENCY_ERROR',
      { streamId, expectedVersion, actualVersion }
    );
  }
}
```

**命名模式**：
- 文件：`[领域/功能].exception.ts`
- 类：`[领域/功能]Exception`

---

## 九、Result 类型

```typescript
// ✅ 正确 - 文件名: result.types.ts
/**
 * Result 类型 - 函数式错误处理
 * 
 * @business-rule 避免抛出异常，使用 Result 类型表示可能失败的操作
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
  readonly isSuccess = true;
  readonly isFailure = false;

  constructor(public readonly value: T) {}

  get error(): never {
    throw new Error('Success 没有 error');
  }
}

export class Failure<E> {
  readonly isSuccess = false;
  readonly isFailure = true;

  constructor(public readonly error: E) {}

  get value(): never {
    throw new Error('Failure 没有 value');
  }
}

// 工厂函数
export const Result = {
  ok: <T>(value: T): Result<T, never> => new Success(value),
  fail: <E>(error: E): Result<never, E> => new Failure(error)
};
```

**命名模式**：
- 文件：`result.types.ts`
- 类型：`Result<T, E>`

---

## 目录结构示例

```
packages/shared-kernel/src/
├── base/
│   ├── aggregate-root.base.ts
│   ├── entity.base.ts
│   ├── value-object.base.ts
│   ├── domain-event.base.ts
│   └── integration-event.base.ts
├── constants/
│   ├── http-status.constants.ts
│   └── pagination.constants.ts
├── enums/
│   ├── job-status.enum.ts
│   └── tenant-tier.enum.ts
├── types/
│   ├── common.types.ts
│   ├── result.types.ts
│   └── maybe.types.ts
├── interfaces/
│   ├── repository.interface.ts
│   ├── event-bus.interface.ts
│   ├── logger.interface.ts
│   └── command-bus.interface.ts
├── utils/
│   ├── date.utils.ts
│   ├── pagination.utils.ts
│   └── id.utils.ts
├── exceptions/
│   ├── domain.exception.ts
│   ├── application.exception.ts
│   ├── infrastructure.exception.ts
│   └── concurrency.exception.ts
└── index.ts
```

---

[下一章：测试文件命名规范 →](./spec-07-testing.md)
