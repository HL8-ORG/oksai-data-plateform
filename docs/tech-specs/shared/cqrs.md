# CQRS 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/cqrs` 实现 CQRS（命令查询职责分离）模式，提供：

- **命令总线**：分发命令到对应处理器
- **查询总线**：分发查询到对应处理器
- **命令基类**：统一的命令定义
- **查询基类**：统一的查询定义

### 1.2 CQRS 原则

| 概念 | 职责 | 特点 |
|------|------|------|
| **Command** | 写操作 | 无返回值，修改状态 |
| **Query** | 读操作 | 有返回值，不修改状态 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/cqrs/
├── lib/
│   ├── commands/
│   │   ├── command.ts           # 命令基类
│   │   ├── command-bus.ts       # 命令总线
│   │   └── command-handler.ts   # 命令处理器接口
│   ├── queries/
│   │   ├── query.ts             # 查询基类
│   │   ├── query-bus.ts         # 查询总线
│   │   └── query-handler.ts     # 查询处理器接口
│   └── index.ts
├── spec/
│   └── ...
└── index.ts
```

### 2.2 CQRS 流程

```
┌─────────────────────────────────────────────────────────────┐
│                     Command Flow                             │
└─────────────────────────────────────────────────────────────┘

Controller/Service
       │
       ▼
┌─────────────────┐
│ CreateJobCommand│
│ { title: '...' }│
└─────────────────┘
       │
       ▼
┌─────────────────┐      ┌─────────────────────────────┐
│  CommandBus     │─────▶│ CreateJobCommandHandler     │
│  .execute()     │      │ .execute(command)           │
└─────────────────┘      └─────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │ 写入数据库       │
                          │ 发出领域事件    │
                          └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Query Flow                              │
└─────────────────────────────────────────────────────────────┘

Controller/Service
       │
       ▼
┌─────────────────┐
│  GetJobQuery    │
│  { id: '123' }  │
└─────────────────┘
       │
       ▼
┌─────────────────┐      ┌─────────────────────────────┐
│   QueryBus      │─────▶│ GetJobQueryHandler          │
│   .execute()    │      │ .execute(query)             │
└─────────────────┘      └─────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │ 读取读模型      │
                          │ 返回 JobDto     │
                          └─────────────────┘
```

---

## 三、使用方式

### 3.1 定义命令

```typescript
// create-job.command.ts
import { Command } from '@oksai/cqrs';

export class CreateJobCommand extends Command {
  constructor(
    public readonly title: string,
    public readonly tenantId: string,
    public readonly items: string[]
  ) {
    super();
  }
}
```

### 3.2 实现命令处理器

```typescript
// create-job.handler.ts
import { CommandHandler, ICommandHandler } from '@oksai/cqrs';
import { CreateJobCommand } from './create-job.command';

@CommandHandler(CreateJobCommand)
export class CreateJobHandler implements ICommandHandler<CreateJobCommand> {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateJobCommand): Promise<void> {
    // 创建聚合
    const jobResult = Job.create({
      title: command.title,
      tenantId: command.tenantId,
      items: command.items,
    });

    if (jobResult.isFail()) {
      throw new Error(jobResult.error);
    }

    const job = jobResult.value;

    // 持久化
    await this.jobRepository.save(job);

    // 发布领域事件
    job.domainEvents.forEach(event => {
      this.eventBus.publish(event);
    });
  }
}
```

### 3.3 执行命令

```typescript
// job.controller.ts
import { CommandBus } from '@oksai/cqrs';

@Controller('jobs')
export class JobController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async create(@Body() dto: CreateJobDto) {
    await this.commandBus.execute(
      new CreateJobCommand(dto.title, dto.tenantId, dto.items)
    );
  }
}
```

### 3.4 定义查询

```typescript
// get-job.query.ts
import { Query } from '@oksai/cqrs';

export class GetJobQuery extends Query<JobDto | null> {
  constructor(public readonly id: string) {
    super();
  }
}
```

### 3.5 实现查询处理器

```typescript
// get-job.handler.ts
import { QueryHandler, IQueryHandler } from '@oksai/cqrs';
import { GetJobQuery } from './get-job.query';

@QueryHandler(GetJobQuery)
export class GetJobHandler implements IQueryHandler<GetJobQuery, JobDto | null> {
  constructor(
    private readonly jobReadRepository: JobReadRepository
  ) {}

  async execute(query: GetJobQuery): Promise<JobDto | null> {
    return this.jobReadRepository.findById(query.id);
  }
}
```

### 3.6 执行查询

```typescript
// job.controller.ts
import { QueryBus } from '@oksai/cqrs';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const job = await this.queryBus.execute(new GetJobQuery(id));
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }
}
```

---

## 四、API 参考

### 4.1 Command

```typescript
abstract class Command {
  readonly timestamp: number;
}

interface ICommandHandler<TCommand extends Command> {
  execute(command: TCommand): Promise<void>;
}
```

### 4.2 CommandBus

```typescript
class CommandBus {
  /**
   * 执行命令
   * @throws Error 如果没有找到对应的处理器
   */
  execute<T extends Command>(command: T): Promise<void>;

  /**
   * 注册命令处理器
   */
  register<T extends Command>(
    command: new (...args: any[]) => T,
    handler: ICommandHandler<T>
  ): void;
}
```

### 4.3 Query

```typescript
abstract class Query<TResult> {
  readonly timestamp: number;
}

interface IQueryHandler<TQuery extends Query<TResult>, TResult> {
  execute(query: TQuery): Promise<TResult>;
}
```

### 4.4 QueryBus

```typescript
class QueryBus {
  /**
   * 执行查询
   * @returns 查询结果
   * @throws Error 如果没有找到对应的处理器
   */
  execute<T extends Query<TResult>, TResult>(query: T): Promise<TResult>;

  /**
   * 注册查询处理器
   */
  register<T extends Query<TResult>, TResult>(
    query: new (...args: any[]) => T,
    handler: IQueryHandler<T, TResult>
  ): void;
}
```

---

## 五、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

---

## 六、命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 命令 | `{动词}{名词}Command` | `CreateJobCommand` |
| 命令处理器 | `{动词}{名词}Handler` | `CreateJobHandler` |
| 查询 | `{动词}{名词}Query` | `GetJobQuery` |
| 查询处理器 | `{动词}{名词}Handler` | `GetJobHandler` |

---

## 七、最佳实践

### 7.1 命令

- 命令应该表达**意图**，而非数据
- 命令处理器应该保证**事务一致性**
- 一个命令对应一个聚合的修改

### 7.2 查询

- 查询应该从**读模型**读取数据
- 查询不应该修改任何状态
- 查询可以返回 DTO 而非领域对象

### 7.3 处理器

- 处理器应该是幂等的
- 使用装饰器注册处理器
- 处理器应该专注单一职责
