# 应用层（Application）命名规范

[返回目录](./spec.md) | [上一章：领域层](./spec-02-domain.md)

---

## 文件命名规范

| 类型 | 文件命名模式 | 示例 |
|:---|:---|:---|
| 命令 | `[name].command.ts` | `create-job.command.ts` |
| 命令处理器 | `[name].handler.ts` | `create-job.handler.ts` |
| 查询 | `[name].query.ts` | `get-job.query.ts` |
| 查询处理器 | `[name].handler.ts` | `get-job.handler.ts` |
| DTO | `[name].dto.ts` | `job.dto.ts`, `create-job-request.dto.ts` |
| 应用服务 | `[name].application-service.ts` | `job.application-service.ts` |
| 事件处理器 | `[name].event-handler.ts` | `job-created.event-handler.ts` |

---

## 一、命令（Command）

```typescript
// ✅ 正确 - 文件名: create-job.command.ts
export class CreateJobCommand implements ICommand { }
export class SubmitJobCommand implements ICommand { }
export class CancelJobCommand implements ICommand { }
export class AddJobItemCommand implements ICommand { }

// ❌ 错误
export class CreateJob { }         // 缺少 Command 后缀
export class CreateJobCmd { }      // 不推荐缩写
export class JobCreateCommand { }  // 词序不自然
```

### 1.1 命令最佳实践

```typescript
// ✅ 正确 - 文件名: create-job.command.ts
export interface CreateJobCommandProps {
  customerId: string;
  tenantId: string;
  title: string;
  description?: string;
  items: CreateJobItemProps[];
  metadata?: CommandMetadata;
}

/**
 * 创建任务命令
 * 
 * @business-rule 客户必须有效
 * @business-rule 任务标题不能为空
 * @business-rule 租户必须处于活跃状态
 */
export class CreateJobCommand implements ICommand {
  public readonly timestamp: Date;
  public readonly correlationId: string;

  constructor(public readonly props: CreateJobCommandProps) {
    this.timestamp = new Date();
    this.correlationId = props.metadata?.correlationId ?? uuidv4();
  }
}
```

**命名模式**：
- 文件：`[动作]-[目标].command.ts`
- 类：`[动作][目标]Command`

---

## 二、命令处理器（Command Handler）

```typescript
// ✅ 正确 - 文件名: create-job.handler.ts
export class CreateJobHandler implements ICommandHandler<CreateJobCommand> { }
export class SubmitJobHandler implements ICommandHandler<SubmitJobCommand> { }
export class CancelJobHandler implements ICommandHandler<CancelJobCommand> { }

// ❌ 错误
export class CreateJobCommandHandler { }  // 冗余
export class CreateJob { }                // 含义不清
```

### 2.1 命令处理器最佳实践

```typescript
// ✅ 正确 - 文件名: create-job.handler.ts
@injectable()
export class CreateJobHandler implements ICommandHandler<CreateJobCommand> {
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  /**
   * 执行创建任务命令
   * 
   * @business-rule 验证客户有效性
   * @business-rule 创建聚合根
   * @business-rule 持久化并发布事件
   */
  async execute(command: CreateJobCommand): Promise<Result<string, ApplicationError>> {
    this.logger.info('开始创建任务', { command });

    // 1. 验证
    const validation = await this.validate(command);
    if (validation.isFailure) {
      return Result.fail(validation.error);
    }

    // 2. 创建聚合
    const jobResult = Job.create({
      customerId: command.props.customerId,
      tenantId: command.props.tenantId,
      title: command.props.title,
    });

    if (jobResult.isFailure) {
      return Result.fail(jobResult.error);
    }

    const job = jobResult.value;

    // 3. 持久化
    await this.jobRepository.save(job);

    // 4. 发布事件
    await this.eventBus.publishAll(job.domainEvents);

    return Result.ok(job.id);
  }
}
```

**命名模式**：
- 文件：`[动作]-[目标].handler.ts`
- 类：`[动作][目标]Handler`（从 Command 名称去掉 `Command` 后缀）

---

## 三、查询（Query）

```typescript
// ✅ 正确 - 文件名: get-job.query.ts
export class GetJobQuery implements IQuery { }
export class ListJobsQuery implements IQuery { }
export class SearchJobsQuery implements IQuery { }
export class JobDetailsQuery implements IQuery { }

// ❌ 错误
export class GetJob { }           // 缺少 Query 后缀
export class JobQuery { }         // 含义不清
```

### 3.1 查询命名风格

```typescript
// 风格 1：动词开头（推荐用于单条记录查询）
// 文件名: get-job.query.ts
export class GetJobQuery { }
export class FindJobByCustomerQuery { }
export class GetTenantStatsQuery { }

// 风格 2：名词开头（推荐用于列表/集合查询）
// 文件名: job-list.query.ts
export class JobListQuery { }
export class JobDetailsQuery { }

// 风格 3：搜索类（推荐使用 Search 前缀）
// 文件名: search-jobs.query.ts
export class SearchJobsQuery { }
```

**命名模式**：
- 文件：`[动作]-[目标].query.ts` 或 `[目标]-[用途].query.ts`
- 类：`[动作][目标]Query` 或 `[目标][用途]Query`

---

## 四、查询处理器（Query Handler）

```typescript
// ✅ 正确 - 文件名: get-job.handler.ts
export class GetJobQueryHandler implements IQueryHandler<GetJobQuery, JobDto> { }
export class ListJobsQueryHandler implements IQueryHandler<ListJobsQuery, PagedResult<JobDto>> { }

// ❌ 错误
export class GetJobHandler { }  // 与命令处理器混淆
```

> **注意**：查询处理器**保留 Query 后缀**，与命令处理器不同。这样做的目的是：
> 1. 避免 `GetJobHandler` 与 `CreateJobHandler` 混淆
> 2. 明确区分命令处理器和查询处理器

**命名模式**：
- 文件：`[查询名称].handler.ts`
- 类：`[查询名称]QueryHandler`（保留 Query）

---

## 五、DTO（Data Transfer Object）

### 5.1 DTO 命名规范

```typescript
// ✅ 正确 - 使用 Dto 后缀（驼峰式）
// 文件名: job.dto.ts
export class JobDto { }
// 文件名: job-summary.dto.ts
export class JobSummaryDto { }
// 文件名: create-job-request.dto.ts
export class CreateJobRequestDto { }
// 文件名: job-response.dto.ts
export class JobResponseDto { }
// 文件名: paged-result.dto.ts
export class PagedResultDto<T> { }

// ❌ 错误
export class JobDTO { }           // 全大写 DTO 不符合驼峰惯例
export class JobResponse { }      // 缺少 Dto 后缀
export class JobData { }          // 含义不清晰
```

### 5.2 DTO 类型划分

```typescript
// ✅ 正确 - 请求 DTO
// 文件名: create-job-request.dto.ts
export class CreateJobRequestDto {
  customerId: string;
  items: CreateJobItemDto[];
}

// 文件名: update-job-request.dto.ts
export class UpdateJobRequestDto {
  title?: string;
  items?: UpdateJobItemDto[];
}

// ✅ 正确 - 响应 DTO
// 文件名: job-response.dto.ts
export class JobResponseDto {
  id: string;
  status: string;
  total: number;
  createdAt: Date;
}

// 文件名: job-summary.dto.ts
export class JobSummaryDto {
  id: string;
  status: string;
  total: number;
  itemCount: number;
}

// ✅ 正确 - 列表项 DTO
// 文件名: job-list-item.dto.ts
export class JobListItemDto {
  id: string;
  customerName: string;
  total: number;
  status: string;
}

// ✅ 正确 - 分页结果 DTO
// 文件名: paged-result.dto.ts
export class PagedResultDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

**命名模式**：
- 文件：`[业务概念]-[用途].dto.ts`
- 类：`[业务概念][用途]Dto`（Dto 使用驼峰式，非全大写）

---

## 六、事件处理器（Event Handler）

```typescript
// ✅ 正确 - 文件名: job-created.event-handler.ts
export class JobCreatedEventHandler implements IEventHandler<JobCreatedEvent> { }

// 文件名: payment-completed.event-handler.ts
export class PaymentCompletedEventHandler implements IEventHandler<PaymentCompletedIntegrationEvent> { }

// ❌ 错误
export class JobCreatedHandler { }  // 与命令处理器混淆
```

### 6.1 事件处理器最佳实践

```typescript
// ✅ 正确 - 文件名: job-created.event-handler.ts
@injectable()
export class JobCreatedEventHandler implements IEventHandler<JobCreatedEvent> {
  constructor(
    private readonly notificationPort: INotificationPort,
    private readonly logger: ILogger
  ) {}

  /**
   * 处理任务创建事件
   * 
   * @business-rule 发送任务创建通知给客户
   */
  async handle(event: JobCreatedEvent): Promise<void> {
    this.logger.info('处理任务创建事件', { eventId: event.eventId });

    // 发送通知
    await this.notificationPort.sendEmail(
      event.data.customerEmail,
      '任务已创建',
      `您的任务 "${event.data.title}" 已成功创建`
    );
  }
}
```

**命名模式**：
- 文件：`[事件名称].event-handler.ts`
- 类：`[事件名称]EventHandler`

---

## 七、应用服务（Application Service）

```typescript
// ✅ 正确 - 文件名: job.application-service.ts
export class JobApplicationService { }

// ❌ 错误
export class JobService { }  // 与领域服务混淆
```

### 7.1 应用服务最佳实践

```typescript
// ✅ 正确 - 文件名: job.application-service.ts
/**
 * 任务应用服务
 * 
 * @business-rule 协调多个用例的编排
 * @business-rule 不包含业务逻辑，业务逻辑在领域层
 */
export class JobApplicationService {
  constructor(
    private readonly commandBus: ICommandBus,
    private readonly queryBus: IQueryBus
  ) {}

  async createJobWithNotification(
    request: CreateJobRequestDto
  ): Promise<JobResponseDto> {
    // 1. 执行命令
    const result = await this.commandBus.execute(
      new CreateJobCommand(request)
    );

    // 2. 发送通知（编排逻辑）
    // ...

    // 3. 返回结果
    return this.queryBus.execute(new GetJobQuery(result.value));
  }
}
```

**命名模式**：
- 文件：`[实体].application-service.ts`
- 类：`[实体]ApplicationService`

---

## 目录结构示例

```
packages/domains-job/src/application/
├── commands/
│   ├── create-job.command.ts
│   ├── submit-job.command.ts
│   ├── cancel-job.command.ts
│   └── handlers/
│       ├── create-job.handler.ts
│       ├── submit-job.handler.ts
│       └── cancel-job.handler.ts
├── queries/
│   ├── get-job.query.ts
│   ├── list-jobs.query.ts
│   ├── search-jobs.query.ts
│   └── handlers/
│       ├── get-job.handler.ts
│       ├── list-jobs.handler.ts
│       └── search-jobs.handler.ts
├── dtos/
│   ├── job.dto.ts
│   ├── job-summary.dto.ts
│   ├── job-list-item.dto.ts
│   ├── create-job-request.dto.ts
│   ├── job-response.dto.ts
│   └── paged-result.dto.ts
├── event-handlers/
│   ├── job-created.event-handler.ts
│   └── payment-completed.event-handler.ts
└── services/
    └── job.application-service.ts
```

---

[下一章：基础设施层命名规范 →](./spec-04-infrastructure.md)
