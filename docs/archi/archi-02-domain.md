# 领域层设计

[返回目录](./archi.md) | [上一章：项目结构](./archi-01-structure.md)

---

## 一、领域层目录结构

```
domain/
├── model/                     # 领域模型
│   ├── job.aggregate.ts       # 聚合根
│   ├── job-item.entity.ts     # 实体
│   ├── job-id.vo.ts           # 值对象
│   ├── job-title.vo.ts        # 值对象
│   └── job-status.vo.ts       # 值对象
│
├── events/                    # 领域事件
│   ├── job-created.domain-event.ts
│   ├── job-started.domain-event.ts
│   ├── job-completed.domain-event.ts
│   └── index.ts
│
├── services/                  # 领域服务
│   └── job-priority.service.ts
│
├── rules/                     # 业务规则
│   └── job-must-have-title.rule.ts
│
├── specifications/            # 规格模式
│   └── active-job.specification.ts
│
├── repositories/              # 仓储接口（Secondary Port）
│   ├── job.repository.ts
│   └── job-read.repository.ts
│
├── ports/                     # 端口定义
│   ├── primary/               # 驱动端口（入站）
│   │   ├── job-command.port.ts
│   │   └── job-query.port.ts
│   └── secondary/             # 被驱动端口（出站）
│       ├── event-store.port.ts
│       └── notification.port.ts
│
├── exceptions/                # 领域异常
│   └── job-domain.exception.ts
│
└── index.ts                   # 领域层导出
```

---

## 二、聚合根基类

```typescript
// libs/shared/kernel/src/domain/aggregate-root.base.ts
import type { DomainEvent } from './domain-event.base';
import type { EventMetadata } from './domain-event.base';

/**
 * 聚合根基类
 * 
 * 所有聚合根都应继承此类，支持事件溯源模式。
 * 聚合根通过 applyChange 方法产生领域事件，
 * 通过 apply 方法响应事件并更新状态。
 */
export abstract class AggregateRoot<TEvent extends DomainEvent = DomainEvent> {
  private _domainEvents: TEvent[] = [];
  private _version: number = -1;
  private _id: string = '';
  private _tenantId: string = '';

  /**
   * 应用变更并记录事件
   * 用于产生新的领域事件
   */
  protected applyChange(event: TEvent): void {
    this.apply(event);
    this._domainEvents.push(event);
    this._version++;
  }

  /**
   * 应用事件（子类实现）
   * 用于响应事件并更新聚合状态
   */
  protected abstract apply(event: TEvent): void;

  /**
   * 获取未提交的事件
   */
  get domainEvents(): TEvent[] {
    return [...this._domainEvents];
  }

  /**
   * 清除已提交的事件
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * 当前版本号
   */
  get version(): number {
    return this._version;
  }

  /**
   * 聚合 ID
   */
  get id(): string {
    return this._id;
  }

  protected set id(value: string) {
    this._id = value;
  }

  /**
   * 租户 ID
   */
  get tenantId(): string {
    return this._tenantId;
  }

  protected set tenantId(value: string) {
    this._tenantId = value;
  }

  /**
   * 从事件流重建聚合
   */
  static rehydrate<T extends AggregateRoot>(
    this: new () => T,
    events: DomainEvent[]
  ): T {
    const aggregate = new this();
    for (const event of events) {
      aggregate.apply(event as TEvent);
      aggregate._version++;
    }
    return aggregate;
  }
}
```

---

## 三、聚合根实现（以 Job 为例）

```typescript
// domain/model/job.aggregate.ts
import { AggregateRoot } from '@oksai/shared/kernel';
import { JobId } from './job-id.vo';
import { JobTitle } from './job-title.vo';
import { JobStatus, JobStatusEnum } from './job-status.vo';
import { JobCreatedEvent } from '../events/job-created.domain-event';
import { JobStartedEvent } from '../events/job-started.domain-event';
import { JobCompletedEvent } from '../events/job-completed.domain-event';
import { JobDomainException } from '../exceptions/job-domain.exception';

/**
 * Job 事件联合类型
 */
export type JobEvent = JobCreatedEvent | JobStartedEvent | JobCompletedEvent;

/**
 * 创建 Job 的属性
 */
export interface CreateJobProps {
  id: JobId;
  title: JobTitle;
  tenantId: string;
  createdBy: string;
}

/**
 * Job 聚合根
 * 
 * 表示一个工作任务，支持状态流转和事件溯源。
 */
export class Job extends AggregateRoot<JobEvent> {
  private _title!: JobTitle;
  private _status!: JobStatus;
  private _createdBy!: string;
  private _startedAt?: Date;
  private _completedAt?: Date;

  private constructor() {
    super();
  }

  // ==================== 工厂方法 ====================

  /**
   * 创建新的 Job
   */
  public static create(props: CreateJobProps): Job {
    const job = new Job();

    job.applyChange(new JobCreatedEvent({
      jobId: props.id.value,
      tenantId: props.tenantId,
      title: props.title.value,
      createdBy: props.createdBy,
      createdAt: new Date(),
    }));

    return job;
  }

  /**
   * 从事件流重建 Job
   */
  public static rehydrate(events: JobEvent[]): Job {
    return super.rehydrate.call(Job, events) as Job;
  }

  // ==================== 行为方法 ====================

  /**
   * 启动 Job
   */
  public start(): void {
    if (!this._status.equals(JobStatus.create(JobStatusEnum.PENDING))) {
      throw new JobDomainException(
        '只能启动待处理状态的 Job',
        'JOB_NOT_PENDING',
        { jobId: this.id, currentStatus: this._status.value }
      );
    }

    this.applyChange(new JobStartedEvent({
      jobId: this.id,
      tenantId: this.tenantId,
      startedAt: new Date(),
    }));
  }

  /**
   * 完成 Job
   */
  public complete(): void {
    if (!this._status.equals(JobStatus.create(JobStatusEnum.IN_PROGRESS))) {
      throw new JobDomainException(
        '只能完成进行中的 Job',
        'JOB_NOT_IN_PROGRESS',
        { jobId: this.id, currentStatus: this._status.value }
      );
    }

    this.applyChange(new JobCompletedEvent({
      jobId: this.id,
      tenantId: this.tenantId,
      completedAt: new Date(),
    }));
  }

  // ==================== 事件应用 ====================

  protected apply(event: JobEvent): void {
    switch (event.eventType) {
      case 'JobCreated':
        this.applyJobCreated(event as JobCreatedEvent);
        break;
      case 'JobStarted':
        this.applyJobStarted(event as JobStartedEvent);
        break;
      case 'JobCompleted':
        this.applyJobCompleted(event as JobCompletedEvent);
        break;
      default:
        // 类型安全：确保所有事件都被处理
        const _exhaustiveCheck: never = event;
        return _exhaustiveCheck;
    }
  }

  private applyJobCreated(event: JobCreatedEvent): void {
    this.id = event.payload.jobId;
    this.tenantId = event.payload.tenantId;
    this._title = JobTitle.fromPersistence(event.payload.title);
    this._status = JobStatus.create(JobStatusEnum.PENDING);
    this._createdBy = event.payload.createdBy;
  }

  private applyJobStarted(event: JobStartedEvent): void {
    this._status = JobStatus.create(JobStatusEnum.IN_PROGRESS);
    this._startedAt = event.payload.startedAt;
  }

  private applyJobCompleted(event: JobCompletedEvent): void {
    this._status = JobStatus.create(JobStatusEnum.COMPLETED);
    this._completedAt = event.payload.completedAt;
  }

  // ==================== Getters ====================

  get title(): JobTitle {
    return this._title;
  }

  get status(): JobStatus {
    return this._status;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get startedAt(): Date | undefined {
    return this._startedAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }
}
```

---

## 四、值对象实现

### 4.1 值对象基类

```typescript
// libs/shared/kernel/src/domain/value-object.base.ts
import { deepEqual } from '../utils/deep-equal';

/**
 * 值对象基类
 * 
 * 值对象通过其属性值进行相等性比较，而不是通过标识。
 */
export abstract class ValueObject<TProps> {
  protected readonly props: TProps;

  constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  /**
   * 值对象相等性比较
   */
  equals(other: ValueObject<TProps>): boolean {
    if (other.constructor !== this.constructor) {
      return false;
    }
    return deepEqual(this.props, other.props);
  }

  /**
   * 获取原始值
   */
  get value(): TProps {
    return this.props;
  }
}
```

### 4.2 JobId 值对象

```typescript
// domain/model/job-id.vo.ts
import { ValueObject } from '@oksai/shared/kernel';
import { v4 as uuidv4 } from 'uuid';

/**
 * Job ID 值对象
 */
export class JobId extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * 创建新的 JobId
   */
  public static create(): JobId {
    return new JobId(uuidv4());
  }

  /**
   * 从已有值创建 JobId
   */
  public static from(value: string): JobId {
    if (!value || value.trim().length === 0) {
      throw new Error('JobId 不能为空');
    }
    return new JobId(value);
  }

  /**
   * 从持久化数据重建（跳过验证）
   */
  public static fromPersistence(value: string): JobId {
    return new JobId(value);
  }

  get value(): string {
    return this.props;
  }
}
```

### 4.3 JobTitle 值对象

```typescript
// domain/model/job-title.vo.ts
import { ValueObject, Result } from '@oksai/shared/kernel';

/**
 * Job 标题值对象
 */
export class JobTitle extends ValueObject<string> {
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 200;

  private constructor(value: string) {
    super(value);
  }

  /**
   * 创建 JobTitle
   */
  public static create(value: string): Result<JobTitle> {
    if (!value || value.trim().length === 0) {
      return Result.fail('Job 标题不能为空');
    }

    const trimmed = value.trim();
    if (trimmed.length < this.MIN_LENGTH) {
      return Result.fail(`Job 标题长度不能小于 ${this.MIN_LENGTH}`);
    }

    if (trimmed.length > this.MAX_LENGTH) {
      return Result.fail(`Job 标题长度不能超过 ${this.MAX_LENGTH}`);
    }

    return Result.ok(new JobTitle(trimmed));
  }

  /**
   * 从持久化数据重建
   */
  public static fromPersistence(value: string): JobTitle {
    return new JobTitle(value);
  }

  get value(): string {
    return this.props;
  }
}
```

### 4.4 JobStatus 值对象

```typescript
// domain/model/job-status.vo.ts
import { ValueObject } from '@oksai/shared/kernel';

/**
 * Job 状态枚举
 */
export enum JobStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Job 状态值对象
 */
export class JobStatus extends ValueObject<JobStatusEnum> {
  private constructor(value: JobStatusEnum) {
    super(value);
  }

  /**
   * 创建 JobStatus
   */
  public static create(value: JobStatusEnum): JobStatus {
    if (!Object.values(JobStatusEnum).includes(value)) {
      throw new Error(`无效的 Job 状态: ${value}`);
    }
    return new JobStatus(value);
  }

  /**
   * 从持久化数据重建
   */
  public static fromPersistence(value: string): JobStatus {
    return new JobStatus(value as JobStatusEnum);
  }

  get value(): JobStatusEnum {
    return this.props;
  }

  /**
   * 是否可以启动
   */
  canStart(): boolean {
    return this.props === JobStatusEnum.PENDING;
  }

  /**
   * 是否可以完成
   */
  canComplete(): boolean {
    return this.props === JobStatusEnum.IN_PROGRESS;
  }
}
```

---

## 五、领域事件实现

### 5.1 领域事件基类

```typescript
// libs/shared/kernel/src/domain/domain-event.base.ts
import { v4 as uuidv4 } from 'uuid';

/**
 * 事件元数据
 */
export interface EventMetadata {
  tenantId: string;
  userId: string;
  correlationId: string;
  causationId?: string;
}

/**
 * 领域事件基类
 */
export abstract class DomainEvent<TPayload = unknown> {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  /**
   * 事件类型（子类必须定义）
   */
  abstract readonly eventType: string;

  /**
   * 事件版本（用于事件升级）
   */
  abstract readonly version: number;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: TPayload,
    public readonly metadata: EventMetadata
  ) {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
  }
}
```

### 5.2 JobCreated 事件

```typescript
// domain/events/job-created.domain-event.ts
import { DomainEvent, EventMetadata } from '@oksai/shared/kernel';

export interface JobCreatedPayload {
  jobId: string;
  tenantId: string;
  title: string;
  createdBy: string;
  createdAt: Date;
}

export class JobCreatedEvent extends DomainEvent<JobCreatedPayload> {
  readonly eventType = 'JobCreated' as const;
  readonly version = 1;

  constructor(
    payload: JobCreatedPayload,
    metadata: EventMetadata
  ) {
    super(payload.jobId, payload, metadata);
  }
}
```

### 5.3 JobStarted 事件

```typescript
// domain/events/job-started.domain-event.ts
import { DomainEvent, EventMetadata } from '@oksai/shared/kernel';

export interface JobStartedPayload {
  jobId: string;
  tenantId: string;
  startedAt: Date;
}

export class JobStartedEvent extends DomainEvent<JobStartedPayload> {
  readonly eventType = 'JobStarted' as const;
  readonly version = 1;

  constructor(
    payload: JobStartedPayload,
    metadata: EventMetadata
  ) {
    super(payload.jobId, payload, metadata);
  }
}
```

### 5.4 JobCompleted 事件

```typescript
// domain/events/job-completed.domain-event.ts
import { DomainEvent, EventMetadata } from '@oksai/shared/kernel';

export interface JobCompletedPayload {
  jobId: string;
  tenantId: string;
  completedAt: Date;
}

export class JobCompletedEvent extends DomainEvent<JobCompletedPayload> {
  readonly eventType = 'JobCompleted' as const;
  readonly version = 1;

  constructor(
    payload: JobCompletedPayload,
    metadata: EventMetadata
  ) {
    super(payload.jobId, payload, metadata);
  }
}
```

---

## 六、仓储接口（Secondary Port）

```typescript
// domain/repositories/job.repository.ts
import type { Job } from '../model/job.aggregate';
import type { JobId } from '../model/job-id.vo';

/**
 * Job 仓储接口（写模型）
 * 
 * 定义在领域层，由基础设施层实现。
 * 这是六边形架构中的 Secondary Port。
 */
export interface JobRepository {
  /**
   * 保存 Job
   */
  save(job: Job): Promise<void>;

  /**
   * 根据 ID 查找 Job
   */
  findById(id: JobId): Promise<Job | null>;

  /**
   * 删除 Job
   */
  delete(id: JobId): Promise<void>;
}
```

```typescript
// domain/repositories/job-read.repository.ts
import type { JobDto } from '../../application/dto/job.dto';

/**
 * Job 读仓储接口（CQRS 读模型）
 */
export interface JobReadRepository {
  /**
   * 根据 ID 查找 Job DTO
   */
  findById(jobId: string, tenantId: string): Promise<JobDto | null>;

  /**
   * 根据状态查找 Job 列表
   */
  findByStatus(status: string, tenantId: string): Promise<JobDto[]>;

  /**
   * 搜索 Job
   */
  search(criteria: JobSearchCriteria): Promise<PagedResult<JobDto>>;
}

export interface JobSearchCriteria {
  tenantId: string;
  status?: string;
  titleContains?: string;
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

## 七、端口定义（六边形架构）

### 7.1 Primary Port（驱动端口）

```typescript
// domain/ports/primary/job-command.port.ts
import type { JobId } from '../../model/job-id.vo';
import type { Result } from '@oksai/shared/kernel';

/**
 * Job 命令端口（Primary Port）
 * 
 * 定义外部世界如何驱动领域执行命令。
 * 这是从外部指向领域内部的入口。
 */
export interface JobCommandPort {
  /**
   * 创建 Job
   */
  createJob(command: CreateJobCommand): Promise<Result<JobId>>;

  /**
   * 启动 Job
   */
  startJob(command: StartJobCommand): Promise<Result<void>>;

  /**
   * 完成 Job
   */
  completeJob(command: CompleteJobCommand): Promise<Result<void>>;
}

export interface CreateJobCommand {
  title: string;
  tenantId: string;
  userId: string;
  correlationId: string;
}

export interface StartJobCommand {
  jobId: string;
  tenantId: string;
  userId: string;
  correlationId: string;
}

export interface CompleteJobCommand {
  jobId: string;
  tenantId: string;
  userId: string;
  correlationId: string;
}
```

```typescript
// domain/ports/primary/job-query.port.ts
import type { JobDto } from '../../../application/dto/job.dto';
import type { PagedResult } from '../../repositories/job-read.repository';

/**
 * Job 查询端口（Primary Port）
 * 
 * 定义外部世界如何查询领域数据。
 */
export interface JobQueryPort {
  /**
   * 获取 Job 详情
   */
  getJob(query: GetJobQuery): Promise<JobDto | null>;

  /**
   * 列出 Job
   */
  listJobs(query: ListJobsQuery): Promise<PagedResult<JobDto>>;
}

export interface GetJobQuery {
  jobId: string;
  tenantId: string;
}

export interface ListJobsQuery {
  tenantId: string;
  status?: string;
  page: number;
  pageSize: number;
}
```

### 7.2 Secondary Port（被驱动端口）

```typescript
// domain/ports/secondary/event-store.port.ts
import type { DomainEvent } from '@oksai/shared/kernel';
import type { Snapshot } from '@oksai/shared/event-store';

/**
 * 事件存储端口（Secondary Port）
 * 
 * 定义领域需要的外部存储能力。
 * 由基础设施层实现具体技术适配。
 */
export interface EventStorePort {
  /**
   * 追加事件到流
   */
  appendToStream(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void>;

  /**
   * 加载事件流
   */
  loadEvents(streamId: string, fromVersion?: number): Promise<DomainEvent[]>;

  /**
   * 保存快照
   */
  saveSnapshot(snapshot: Snapshot): Promise<void>;

  /**
   * 加载快照
   */
  loadSnapshot(streamId: string): Promise<Snapshot | null>;
}
```

---

## 八、领域异常

```typescript
// domain/exceptions/job-domain.exception.ts
import { DomainException } from '@oksai/shared/kernel';

/**
 * Job 领域异常
 */
export class JobDomainException extends DomainException {
  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message, code, 'job', context);
  }
}
```

```typescript
// libs/shared/kernel/src/domain/domain-exception.base.ts
/**
 * 领域异常基类
 */
export abstract class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly domain: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

---

[下一章：事件存储实现 →](./archi-03-event-store.md)
