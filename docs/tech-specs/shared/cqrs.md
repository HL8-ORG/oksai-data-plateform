# CQRS 模块技术规范

> 版本：0.2.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/cqrs` 实现 CQRS（命令查询职责分离）模式，提供：

- **命令总线（CommandBus）**：分发命令到对应处理器，支持 Pipeline 横切能力
- **查询总线（QueryBus）**：分发查询到对应处理器，支持 Pipeline 横切能力
- **Pipeline 模式**：审计、指标、校验、鉴权等横切关注点
- **装饰器**：`@CommandHandler`、`@QueryHandler` 自动探测与注册
- **NestJS 集成**：`OksaiCqrsModule.forRoot()` 配置

### 1.2 设计原则

- **简洁接口**：`ICommand` 仅需 `type` 字段，上下文从 CLS 获取
- **Pipeline 优先**：横切关注点通过管道组合，而非硬编码
- **职责单一**：不包含 EventBus/Saga（由 `@oksai/eda` 负责）
- **中文错误消息**：所有错误消息使用中文

### 1.3 与 @oksai/eda 的边界

| 功能 | 负责模块 |
|:---|:---|
| Command/Query 调度 | `@oksai/cqrs` |
| Pipeline（审计、指标、校验、鉴权） | `@oksai/cqrs` |
| EventBus | `@oksai/eda` |
| Transactional Outbox | `@oksai/eda` |
| Saga | `@oksai/eda` |
| Kafka 集成 | `@oksai/eda` |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/cqrs/
├── lib/
│   ├── interfaces.ts                    # ICommand, IQuery, ICommandHandler, IQueryHandler
│   ├── cqrs.module.ts                   # OksaiCqrsModule
│   ├── buses/
│   │   ├── command-bus.ts              # CommandBus（带 Pipeline 支持）
│   │   └── query-bus.ts                # QueryBus（带 Pipeline 支持）
│   ├── decorators/
│   │   ├── command-handler.decorator.ts
│   │   ├── query-handler.decorator.ts
│   │   └── metadata.constants.ts
│   ├── pipeline/
│   │   ├── pipeline.ts                 # 核心管道逻辑
│   │   └── pipes/
│   │       ├── audit.pipe.ts           # 审计日志
│   │       ├── metrics.pipe.ts         # 指标统计
│   │       ├── validation.pipe.ts      # 输入校验
│   │       └── authorization.pipe.ts   # 用例级鉴权
│   └── services/
│       └── explorer.service.ts         # 自动探测 Handler
└── index.ts
```

### 2.2 Pipeline 执行顺序

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Pipeline 执行顺序                                  │
└─────────────────────────────────────────────────────────────────────────────┘

CommandBus.execute(command)
         │
         ▼
┌─────────────────┐
│ ValidationPipe  │  1. 输入校验（class-validator）
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│ AuthorizationPipe│  2. 用例级鉴权（@RequirePermission）
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│   AuditPipe     │  3. 审计日志（开始）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MetricsPipe   │  4. 指标统计（开始计时）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Handler      │  5. 业务逻辑执行
│  .execute()     │
└────────┬────────┘
         │
         ▼ (返回)
   MetricsPipe (记录耗时)
         │
         ▼
   AuditPipe (记录结果)
         │
         ▼
    返回结果
```

### 2.3 CQRS 流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Command Flow                                       │
└─────────────────────────────────────────────────────────────────────────────┘

Controller/Service
        │
        ▼
┌─────────────────────┐
│ CreateJobCommand    │
│ type: 'CreateJob'   │
│ title: '...'        │
└─────────────────────┘
        │
        ▼
┌─────────────────┐      ┌─────────────────────────────┐
│  CommandBus     │─────▶│ Pipeline                    │
│  .execute()     │      │  → Validation               │
└─────────────────┘      │  → Authorization            │
                         │  → Audit                    │
                         │  → Metrics                  │
                         │  → CreateJobHandler         │
                         └─────────────────────────────┘
                                     │
                                     ▼
                           ┌─────────────────┐
                           │ 写入数据库       │
                           │ 发布集成事件     │ → @oksai/eda
                           └─────────────────┘
```

---

## 三、使用方式

### 3.1 定义命令

```typescript
// create-job.command.ts
import type { ICommand } from '@oksai/cqrs';

export interface CreateJobCommand extends ICommand {
  type: 'CreateJob';
  title: string;
  budget: number;
}
```

### 3.2 实现命令处理器

```typescript
// create-job.handler.ts
import { CommandHandler, type ICommandHandler } from '@oksai/cqrs';
import type { CreateJobCommand } from './create-job.command';

@CommandHandler('CreateJob')
export class CreateJobHandler implements ICommandHandler<CreateJobCommand> {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly outboxProducer: OutboxProducer
  ) {}

  async execute(command: CreateJobCommand): Promise<void> {
    // 创建聚合
    const jobResult = Job.create({
      title: command.title,
      budget: command.budget
    });

    if (jobResult.isFail()) {
      throw new Error(jobResult.error);
    }

    const job = jobResult.value;

    // 持久化
    await this.jobRepository.save(job);

    // 发布集成事件（通过 @oksai/eda）
    await this.outboxProducer.publish(job.integrationEvents);
  }
}
```

### 3.3 定义查询

```typescript
// get-job.query.ts
import type { IQuery } from '@oksai/cqrs';

export interface GetJobQuery extends IQuery {
  type: 'GetJob';
  id: string;
}
```

### 3.4 实现查询处理器

```typescript
// get-job.handler.ts
import { QueryHandler, type IQueryHandler } from '@oksai/cqrs';
import type { GetJobQuery } from './get-job.query';

@QueryHandler('GetJob')
export class GetJobHandler implements IQueryHandler<GetJobQuery, JobDto | null> {
  constructor(private readonly jobReadRepository: JobReadRepository) {}

  async execute(query: GetJobQuery): Promise<JobDto | null> {
    return this.jobReadRepository.findById(query.id);
  }
}
```

### 3.5 NestJS 模块配置

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { OksaiCqrsModule } from '@oksai/cqrs';

@Module({
  imports: [
    OksaiCqrsModule.forRoot({
      pipeline: {
        audit: true,       // 启用审计日志
        metrics: true,     // 启用指标统计
        validation: true,  // 启用输入校验
        authorization: false // 禁用鉴权
      },
      isGlobal: true
    })
  ],
  providers: [
    CreateJobHandler,
    GetJobHandler
  ]
})
export class AppModule {}
```

### 3.6 Controller 使用

```typescript
// job.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@oksai/cqrs';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  async create(@Body() dto: CreateJobDto) {
    await this.commandBus.execute({
      type: 'CreateJob',
      title: dto.title,
      budget: dto.budget
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const job = await this.queryBus.execute({
      type: 'GetJob',
      id
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }
}
```

---

## 四、Pipeline 管道

### 4.1 AuditPipe（审计日志）

自动记录用例执行的审计日志：

```typescript
// 日志输出示例
{
  message: '用例执行成功',
  commandType: 'CreateJob',
  tenantId: 'tenant-1',
  userId: 'user-1',
  requestId: 'req-1',
  duration: 150,
  status: 'success'
}
```

### 4.2 MetricsPipe（指标统计）

通过 `ICqrsMetricsCollector` 接口收集指标：

```typescript
export interface ICqrsMetricsCollector {
  recordMetrics(metrics: CqrsMetrics): void;
}

export interface CqrsMetrics {
  commandType: string;
  duration: number;
  status: 'success' | 'error';
  errorType?: string;
  tenantId?: string;
}
```

### 4.3 ValidationPipe（输入校验）

使用 `class-validator` 进行输入校验：

```typescript
import { UseValidationDto } from '@oksai/cqrs';
import { IsString, IsNumber } from 'class-validator';

class CreateJobDto {
  @IsString()
  title!: string;

  @IsNumber()
  budget!: number;
}

@UseValidationDto(CreateJobDto)
export class CreateJobCommand implements ICommand {
  type: 'CreateJob' as const;
  title!: string;
  budget!: number;
}
```

### 4.4 AuthorizationPipe（用例级鉴权）

通过 `@RequirePermission` 声明所需权限：

```typescript
import { RequirePermission } from '@oksai/cqrs';

@RequirePermission('job:create')
export class CreateJobCommand implements ICommand {
  type: 'CreateJob' as const;
  // ...
}
```

自定义权限检查器：

```typescript
import { type IPermissionChecker } from '@oksai/cqrs';

@Injectable()
export class CaslPermissionChecker implements IPermissionChecker {
  async checkPermission(params: { userId?: string; tenantId?: string; commandType: string }): Promise<boolean> {
    // 接入 CASL 或 RBAC 系统
    return this.caslService.can(params.userId, params.commandType);
  }
}

// 模块配置
OksaiCqrsModule.forRoot({
  pipeline: {
    authorization: true,
    permissionChecker: {
      provide: 'CQRS_PERMISSION_CHECKER',
      useClass: CaslPermissionChecker
    }
  }
})
```

---

## 五、API 参考

### 5.1 ICommand / IQuery

```typescript
export interface ICommand<TType extends string = string> {
  type: TType;
}

export interface IQuery<TType extends string = string> {
  type: TType;
}
```

### 5.2 ICommandHandler / IQueryHandler

```typescript
export interface ICommandHandler<TCommand extends ICommand = ICommand, TResult = unknown> {
  execute(command: TCommand): Promise<TResult>;
}

export interface IQueryHandler<TQuery extends IQuery = IQuery, TResult = unknown> {
  execute(query: TQuery): Promise<TResult>;
}
```

### 5.3 CommandBus / QueryBus

```typescript
class CommandBus {
  register(commandType: string, handler: ICommandHandler): void;
  registerPipes(pipes: Array<ICqrsPipe>): void;
  execute<TResult = unknown>(command: ICommand): Promise<TResult>;
}

class QueryBus {
  register(queryType: string, handler: IQueryHandler): void;
  registerPipes(pipes: Array<ICqrsPipe>): void;
  execute<TResult = unknown>(query: IQuery): Promise<TResult>;
}
```

### 5.4 OksaiCqrsModule

```typescript
interface CqrsModuleOptions {
  pipeline?: CqrsPipelineOptions;
  isGlobal?: boolean;
}

interface CqrsPipelineOptions {
  audit?: boolean;                    // 默认 true
  metrics?: boolean;                  // 默认 true
  validation?: boolean | ValidationPipeOptions;  // 默认 false
  authorization?: boolean;            // 默认 false
  metricsCollector?: Provider<ICqrsMetricsCollector>;
  permissionChecker?: Provider<IPermissionChecker>;
}

class OksaiCqrsModule {
  static forRoot(options?: CqrsModuleOptions): DynamicModule;
}
```

### 5.5 装饰器

```typescript
function CommandHandler(commandType: string): ClassDecorator;
function QueryHandler(queryType: string): ClassDecorator;
function UseValidationDto(dtoClass: new (...args: unknown[]) => object): ClassDecorator;
function RequirePermission(action: string): ClassDecorator;
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|:---|:---|
| Test Suites | 7 passed |
| Tests | 26 passed |

**测试文件**：
- `command-bus.spec.ts` - 命令总线测试
- `query-bus.spec.ts` - 查询总线测试
- `command-handler.decorator.spec.ts` - 装饰器测试
- `query-handler.decorator.spec.ts` - 装饰器测试
- `pipeline.spec.ts` - Pipeline 核心测试
- `audit.pipe.spec.ts` - 审计管道测试
- `metrics.pipe.spec.ts` - 指标管道测试

---

## 七、命名规范

| 类型 | 格式 | 示例 |
|:---|:---|:---|
| 命令类型 | `VerbNoun` | `CreateJob` |
| 命令接口 | `ICommand` | `CreateJobCommand extends ICommand` |
| 命令处理器 | `VerbNounHandler` | `CreateJobHandler` |
| 查询类型 | `VerbNoun` | `GetJob` |
| 查询接口 | `IQuery` | `GetJobQuery extends IQuery` |
| 查询处理器 | `VerbNounHandler` | `GetJobHandler` |

---

## 八、注意事项

1. **CLS 上下文**：`tenantId`/`userId`/`requestId` 必须从 CLS 获取，不得从 payload 覆盖
2. **幂等性**：处理器应设计为幂等的，支持重复执行
3. **事务边界**：命令处理器负责事务一致性
4. **事件发布**：集成事件通过 `@oksai/eda` 发布，不在 CQRS 模块内
5. **中文错误**：所有错误消息必须使用中文

---

## 九、与其他模块集成

### 9.1 与 @oksai/context 集成

```typescript
import { runWithOksaiContext } from '@oksai/context';

await runWithOksaiContext(
  { tenantId: 'tenant-1', userId: 'user-1', requestId: 'req-1' },
  async () => {
    await commandBus.execute({ type: 'CreateJob', ... });
  }
);
```

### 9.2 与 @oksai/eda 集成

```typescript
@CommandHandler('CreateJob')
export class CreateJobHandler implements ICommandHandler<CreateJobCommand> {
  constructor(
    private readonly outboxProducer: OutboxProducer // from @oksai/eda
  ) {}

  async execute(command: CreateJobCommand): Promise<void> {
    // 业务逻辑...
    
    // 发布集成事件
    const event = buildIntegrationEventFromCurrentContext({
      eventName: 'JobCreated',
      eventVersion: 1,
      payload: { id: job.id },
      partitionKey: job.id
    });
    await insertIntegrationOutboxEvent(this.em, event);
  }
}
```

---

## 十、迁移指南（v0.1 → v0.2）

### 10.1 接口简化

```typescript
// v0.1（旧）
class CreateJobCommand extends Command {
  constructor(
    public readonly title: string,
    public readonly tenantId: string
  ) { super(); }
}

// v0.2（新）
interface CreateJobCommand extends ICommand {
  type: 'CreateJob';
  title: string;
  // tenantId 从 CLS 获取
}
```

### 10.2 装饰器变化

```typescript
// v0.1（旧）
@CommandHandler(CreateJobCommand)

// v0.2（新）- 使用稳定字符串
@CommandHandler('CreateJob')
```

### 10.3 新增 Pipeline 支持

```typescript
// v0.2 新增
OksaiCqrsModule.forRoot({
  pipeline: {
    audit: true,
    metrics: true,
    validation: true
  }
})
```
