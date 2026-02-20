# 领域层（Domain）命名规范

[返回目录](./spec.md) | [上一章：核心原则](./spec-01-overview.md)

---

## 文件命名规范

| 类型 | 文件命名模式 | 示例 |
|:---|:---|:---|
| 聚合根 | `[name].aggregate.ts` | `job.aggregate.ts` |
| 实体 | `[name].entity.ts` | `job-item.entity.ts` |
| 值对象 | `[name].vo.ts` | `job-id.vo.ts`, `money.vo.ts` |
| 领域事件 | `[name].domain-event.ts` | `job-created.domain-event.ts` |
| 仓储接口 | `[name].repository.ts` | `job.repository.ts` |
| 领域服务 | `[name].domain-service.ts` | `pricing.domain-service.ts` |
| 规约 | `[name].spec.ts` | `job-eligibility.spec.ts` |
| 业务规则 | `[name].rule.ts` | `job-must-have-items.rule.ts` |
| 领域异常 | `[name].domain-exception.ts` | `job.domain-exception.ts` |
| 端口 | `[name].port.ts` | `job-command.port.ts` |

---

## 一、聚合根（Aggregate Root）

```typescript
// ✅ 正确 - 文件名: job.aggregate.ts
export class Job extends AggregateRoot<JobProps> { }
export class Tenant extends AggregateRoot<TenantProps> { }
export class Product extends AggregateRoot<ProductProps> { }

// ❌ 错误
export class JobAggregate { }  // 冗余的 Aggregate 后缀
export class JobEntity { }     // 应该明确是聚合根而不是普通实体
```

**命名模式**：
- 文件：`[name].aggregate.ts`
- 类：`PascalCase`，无后缀

---

## 二、实体（Entity）

```typescript
// ✅ 正确 - 文件名: job-item.entity.ts
export class JobItem extends Entity<JobItemProps> { }
export class UserProfile extends Entity<UserProfileProps> { }
export class PaymentMethod extends Entity<PaymentMethodProps> { }

// ❌ 错误
export class JobItemEntity { }  // 冗余
```

**命名模式**：
- 文件：`[name].entity.ts`
- 类：`PascalCase`，无后缀（通过继承表达身份）

---

## 三、值对象（Value Object）

```typescript
// ✅ 正确 - 文件名: job-id.vo.ts, money.vo.ts, email.vo.ts
export class JobId extends ValueObject<string> { }
export class Money extends ValueObject<MoneyProps> { }
export class Email extends ValueObject<string> { }
export class PhoneNumber extends ValueObject<string> { }

// ❌ 错误
export class JobIdValueObject { }  // 冗余
export class JobIdVO { }           // 不推荐缩写
```

### 3.1 值对象最佳实践

```typescript
// ✅ 正确 - 文件名: email.vo.ts
export class Email extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * 创建邮箱值对象
   * 
   * @param value - 邮箱字符串
   * @returns 验证通过的 Email 或错误
   * 
   * @business-rule 邮箱必须符合标准格式
   * @business-rule 邮箱不区分大小写，存储时转为小写
   */
  public static create(value: string): Result<Email, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('邮箱不能为空', 'email', value));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return Result.fail(new ValidationError('邮箱格式不正确', 'email', value));
    }

    return Result.ok(new Email(value.toLowerCase()));
  }

  /**
   * 从持久化数据重建（跳过验证，仅用于从数据库加载）
   */
  public static fromPersistence(value: string): Email {
    return new Email(value);
  }

  get value(): string {
    return this.props;
  }
}
```

**命名模式**：
- 文件：`[name].vo.ts`
- 类：`PascalCase`，通常是描述属性的名词

---

## 四、领域事件（Domain Event）

```typescript
// ✅ 正确 - 文件名: job-created.domain-event.ts
export class JobCreatedEvent implements IDomainEvent<JobCreatedPayload> { }
export class JobItemAddedEvent implements IDomainEvent<JobItemAddedPayload> { }
export class JobSubmittedEvent implements IDomainEvent<JobSubmittedPayload> { }
export class JobCancelledEvent implements IDomainEvent<JobCancelledPayload> { }

// ❌ 错误
export class JobCreated { }           // 缺少 Event 后缀
export class JobCreatedDomainEvent { } // 冗余
```

### 4.1 领域事件最佳实践

```typescript
// ✅ 正确 - 文件名: job-created.domain-event.ts
export interface JobCreatedPayload {
  jobId: string;
  tenantId: string;
  customerId: string;
  title: string;
  createdAt: Date;
}

/**
 * 任务已创建领域事件
 * 
 * @business-rule 任务创建后状态为 DRAFT
 * @business-rule 事件版本号用于支持事件结构演进
 */
export class JobCreatedEvent implements IDomainEvent<JobCreatedPayload> {
  public readonly eventId: string;
  public readonly eventType = 'JobCreated';
  public readonly occurredAt: Date;
  public readonly version = 1;

  constructor(
    public readonly aggregateId: string,
    public readonly data: JobCreatedPayload,
    public readonly metadata: EventMetadata
  ) {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
  }
}
```

**命名模式**：
- 文件：`[name].domain-event.ts`
- 类：`[实体][过去式动作]Event`

---

## 五、仓储接口（Repository Interface）

```typescript
// ✅ 正确 - 文件名: job.repository.ts
// 位置：domain/repositories/job.repository.ts
export interface IJobRepository {
  save(job: Job): Promise<void>;
  findById(id: string): Promise<Job | null>;
  delete(id: string): Promise<void>;
}

// ✅ 正确 - 读模型仓储（CQRS）- 文件名: job-read.repository.ts
export interface IJobReadRepository {
  findById(id: string): Promise<JobDto | null>;
  findByCriteria(criteria: JobCriteria): Promise<JobDto[]>;
}

// ❌ 错误
export interface JobRepo { }                  // 不够清晰
export interface JobRepositoryInterface { }   // 冗余的 Interface 后缀
export interface IJobRepositoryInterface { }  // 更冗余
```

**命名模式**：
- 文件：`[name].repository.ts` 或 `[name]-read.repository.ts`
- 位置：`domain/repositories/`
- 接口：`I[实体]Repository`

---

## 六、端口（Port）

### 6.1 驱动端口（Primary Port）

驱动端口定义外部如何调用领域服务，位于 `domain/ports/` 目录。

```typescript
// ✅ 正确 - 文件名: job-command.port.ts
// 位置：domain/ports/job-command.port.ts
export interface IJobCommandPort {
  createJob(command: CreateJobCommand): Promise<Result<string, ApplicationError>>;
  submitJob(command: SubmitJobCommand): Promise<Result<void, ApplicationError>>;
  cancelJob(command: CancelJobCommand): Promise<Result<void, ApplicationError>>;
}

// ✅ 正确 - 文件名: job-query.port.ts
export interface IJobQueryPort {
  getJob(query: GetJobQuery): Promise<JobDto | null>;
  listJobs(query: ListJobsQuery): Promise<PagedResultDto<JobListItemDto>>;
}
```

### 6.2 被驱动端口（Secondary Port）

被驱动端口定义领域依赖的外部服务接口。

```typescript
// ✅ 正确 - 文件名: notification.port.ts
// 位置：domain/ports/notification.port.ts
export interface INotificationPort {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSms(phoneNumber: string, message: string): Promise<void>;
}

// ✅ 正确 - 文件名: payment-gateway.port.ts
export interface IPaymentGatewayPort {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  refundPayment(paymentId: string): Promise<RefundResult>;
}
```

**命名模式**：
- 文件：`[name].port.ts` 或 `[name]-[type].port.ts`
- 位置：`domain/ports/`
- 接口：`I[功能]Port`

---

## 七、领域服务（Domain Service）

```typescript
// ✅ 正确 - 文件名: pricing.domain-service.ts
export class PricingDomainService { }
export class TenantProvisioningDomainService { }
export class CurrencyConversionDomainService { }

// ❌ 错误
export class PricingService { }  // 与应用服务混淆
```

**使用场景**：
- 当业务逻辑不适合放在单个聚合根中时
- 需要协调多个聚合根时
- 跨边界的业务规则验证

**命名模式**：
- 文件：`[name].domain-service.ts`
- 类：`[业务概念]DomainService`

---

## 八、规约/业务规则（Specification / Rule）

### 8.1 规约模式（Specification）

```typescript
// ✅ 正确 - 文件名: job-eligibility.spec.ts
export class JobEligibilitySpec implements ISpecification<Job> { }
export class CustomerCreditSpec implements ISpecification<Customer> { }

// 命名模式：[业务概念][条件]Spec
```

### 8.2 业务规则（Business Rule）

```typescript
// ✅ 正确 - 文件名: job-must-have-items.rule.ts
/**
 * 任务必须包含工作项规则
 * 
 * @business-rule 提交任务时必须至少包含一个工作项
 */
export class JobMustHaveItemsRule implements IBusinessRule {
  constructor(private readonly job: Job) {}

  get message(): string {
    return '任务必须包含至少一个工作项';
  }

  isBroken(): boolean {
    return this.job.items.length === 0;
  }
}

// 文件名: customer-credit-limit.rule.ts
export class CustomerCreditLimitRule implements IBusinessRule {
  constructor(
    private readonly customer: Customer,
    private readonly totalAmount: Money
  ) {}

  get message(): string {
    return '客户信用额度不足';
  }

  async isBroken(): Promise<boolean> {
    const credit = await this.customer.getAvailableCredit();
    return this.totalAmount.amount > credit;
  }
}
```

**Spec 与 Rule 的区别**：
- **Spec**：用于查询和筛选，返回布尔值，可组合（AND/OR/NOT）
- **Rule**：用于验证业务规则，包含错误消息，支持异步验证

**命名模式**：
- 文件：`[name].spec.ts` 或 `[name].rule.ts`
- 类：`[业务概念][条件]Spec` 或 `[业务概念][条件]Rule`

---

## 九、领域异常（Domain Exception）

```typescript
// ✅ 正确 - 文件名: job.domain-exception.ts
/**
 * 任务领域异常
 * 
 * @business-rule 所有任务相关的业务规则违反都应抛出此异常
 */
export class JobDomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'JobDomainException';
  }
}

// 使用
if (this._status !== JobStatus.DRAFT) {
  throw new JobDomainException(
    '只能修改草稿状态的任务',
    'JOB_NOT_DRAFT',
    { jobId: this.id, currentStatus: this._status }
  );
}
```

**命名模式**：
- 文件：`[name].domain-exception.ts`
- 类：`[领域]DomainException`

---

## 目录结构示例

```
packages/domains-job/src/domain/
├── aggregates/
│   └── job.aggregate.ts
├── entities/
│   └── job-item.entity.ts
├── value-objects/
│   ├── job-id.vo.ts
│   ├── job-title.vo.ts
│   └── job-status.vo.ts
├── events/
│   ├── job-created.domain-event.ts
│   ├── job-submitted.domain-event.ts
│   └── job-cancelled.domain-event.ts
├── repositories/
│   ├── job.repository.ts
│   └── job-read.repository.ts
├── ports/
│   ├── job-command.port.ts
│   ├── job-query.port.ts
│   └── notification.port.ts
├── services/
│   └── pricing.domain-service.ts
├── specifications/
│   └── job-eligibility.spec.ts
├── rules/
│   └── job-must-have-items.rule.ts
└── exceptions/
    └── job.domain-exception.ts
```

---

[下一章：应用层命名规范 →](./spec-03-application.md)
