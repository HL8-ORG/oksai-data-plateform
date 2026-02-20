# 接口层（Interface）命名规范

[返回目录](./spec.md) | [上一章：基础设施层](./spec-04-infrastructure.md)

---

## 文件命名规范

| 类型 | 文件命名模式 | 示例 |
|:---|:---|:---|
| REST 控制器 | `[name].controller.ts` | `job.controller.ts` |
| GraphQL 解析器 | `[name].resolver.ts` | `job.resolver.ts` |
| 中间件 | `[name].middleware.ts` | `tenant.middleware.ts` |
| 验证器 | `[name].validator.ts` | `create-job.validator.ts` |
| 调度器 | `[name].scheduler.ts` | `job-timeout.scheduler.ts` |
| 守护进程 | `[name].guard.ts` | `roles.guard.ts` |
| 拦截器 | `[name].interceptor.ts` | `logging.interceptor.ts` |
| 管道 | `[name].pipe.ts` | `validation.pipe.ts` |
| 过滤器 | `[name].filter.ts` | `http-exception.filter.ts` |

---

## 一、REST 控制器（Controller）

```typescript
// ✅ 正确
// 文件名: job.controller.ts
export class JobController { }
// 文件名: tenant.controller.ts
export class TenantController { }
// 文件名: auth.controller.ts
export class AuthController { }

// ❌ 错误
export class JobsController { }  // 复数形式不推荐
export class JobRestController { }  // 冗余
```

### 1.1 控制器最佳实践

```typescript
// ✅ 正确 - 文件名: job.controller.ts
/**
 * 任务 REST 控制器
 * 
 * @business-rule 所有操作需要租户上下文
 * @business-rule 用户只能访问自己租户的数据
 */
@Controller('api/v1/jobs')
export class JobController {
  constructor(
    private readonly commandBus: ICommandBus,
    private readonly queryBus: IQueryBus
  ) {}

  /**
   * 创建任务
   * 
   * @business-rule 验证请求参数
   * @business-rule 自动注入租户 ID
   */
  @Post()
  async create(
    @Body() dto: CreateJobRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<JobResponseDto> {
    const command = new CreateJobCommand({
      ...dto,
      tenantId: req.tenantId,
      userId: req.userId
    });
    const result = await this.commandBus.execute(command);
    return this.queryBus.execute(new GetJobQuery(result.value));
  }

  /**
   * 获取单个任务
   */
  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<JobDto> {
    return this.queryBus.execute(new GetJobQuery({ 
      id, 
      tenantId: req.tenantId 
    }));
  }

  /**
   * 获取任务列表
   */
  @Get()
  async list(
    @Query() query: ListJobsQueryDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PagedResultDto<JobListItemDto>> {
    return this.queryBus.execute(new ListJobsQuery({
      ...query,
      tenantId: req.tenantId
    }));
  }

  /**
   * 提交任务
   */
  @Post(':id/submit')
  async submit(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    await this.commandBus.execute(new SubmitJobCommand({
      jobId: id,
      tenantId: req.tenantId
    }));
  }

  /**
   * 取消任务
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelJobRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    await this.commandBus.execute(new CancelJobCommand({
      jobId: id,
      tenantId: req.tenantId,
      reason: dto.reason
    }));
  }
}
```

**命名模式**：
- 文件：`[资源].controller.ts`
- 类：`[资源]Controller`

---

## 二、GraphQL 解析器（Resolver）

```typescript
// ✅ 正确
// 文件名: job.resolver.ts
export class JobResolver { }
// 文件名: tenant.resolver.ts
export class TenantResolver { }

// ❌ 错误
export class JobGraphQLResolver { }  // 冗余
```

### 2.1 解析器最佳实践

```typescript
// ✅ 正确 - 文件名: job.resolver.ts
/**
 * 任务 GraphQL 解析器
 */
@Resolver(() => Job)
export class JobResolver {
  constructor(
    private readonly commandBus: ICommandBus,
    private readonly queryBus: IQueryBus
  ) {}

  /**
   * 查询单个任务
   */
  @Query(() => Job, { nullable: true })
  async job(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ): Promise<JobDto | null> {
    return this.queryBus.execute(new GetJobQuery({
      id,
      tenantId: context.tenantId
    }));
  }

  /**
   * 查询任务列表
   */
  @Query(() => [Job])
  async jobs(
    @Args() args: ListJobsArgs,
    @Context() context: GraphQLContext
  ): Promise<JobDto[]> {
    return this.queryBus.execute(new ListJobsQuery({
      ...args,
      tenantId: context.tenantId
    }));
  }

  /**
   * 创建任务
   */
  @Mutation(() => Job)
  async createJob(
    @Args('input') input: CreateJobInput,
    @Context() context: GraphQLContext
  ): Promise<JobDto> {
    const command = new CreateJobCommand({
      ...input,
      tenantId: context.tenantId,
      userId: context.userId
    });
    const result = await this.commandBus.execute(command);
    return this.queryBus.execute(new GetJobQuery(result.value));
  }

  /**
   * 解析客户字段
   */
  @ResolveField(() => Customer)
  async customer(@Parent() job: JobDto): Promise<CustomerDto> {
    return this.queryBus.execute(new GetCustomerQuery(job.customerId));
  }
}
```

**命名模式**：
- 文件：`[资源].resolver.ts`
- 类：`[资源]Resolver`

---

## 三、中间件（Middleware）

```typescript
// ✅ 正确 - 函数式中间件
// 文件名: tenant.middleware.ts
export const tenantMiddleware = (req, res, next) => { };
// 文件名: auth.middleware.ts
export const authMiddleware = (req, res, next) => { };

// ✅ 正确 - 类式中间件
// 文件名: request-logging.middleware.ts
export class RequestLoggingMiddleware implements IMiddleware { }
// 文件名: rate-limit.middleware.ts
export class RateLimitMiddleware implements IMiddleware { }
```

### 3.1 中间件最佳实践

```typescript
// ✅ 正确 - 文件名: tenant.middleware.ts
/**
 * 多租户中间件
 * 
 * @business-rule 从请求中提取租户标识
 * @business-rule 验证租户有效性
 * @business-rule 注入租户上下文到请求
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly logger: ILogger
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = this.extractTenantId(req);

    if (!tenantId) {
      throw new BadRequestException('缺少租户标识');
    }

    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('无效或已停用的租户');
    }

    // 注入到请求上下文
    req.tenantId = tenantId;
    req.tenant = tenant;

    this.logger.setContext({ tenantId });
    next();
  }

  private extractTenantId(req: Request): string | null {
    return (
      req.headers['x-tenant-id'] as string ||
      req.query.tenantId as string ||
      this.extractFromSubdomain(req.hostname)
    );
  }
}

// ✅ 正确 - 文件名: request-logging.middleware.ts
/**
 * 请求日志中间件
 * 
 * @business-rule 记录请求开始和完成时间
 * @business-rule 记录请求耗时
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: ILogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = uuidv4();

    req.requestId = requestId;

    this.logger.info('请求开始', {
      requestId,
      method: req.method,
      url: req.url,
      tenantId: req.tenantId
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logger.info('请求完成', {
        requestId,
        statusCode: res.statusCode,
        duration
      });
    });

    next();
  }
}
```

**命名模式**：
- 文件：`[功能].middleware.ts`
- 类：`[功能]Middleware`

---

## 四、验证器（Validator）

```typescript
// ✅ 正确
// 文件名: create-job.validator.ts
export class CreateJobValidator implements IValidator<CreateJobRequest> { }
// 文件名: update-tenant.validator.ts
export class UpdateTenantValidator implements IValidator<UpdateTenantRequest> { }
```

### 4.1 验证器最佳实践（使用 class-validator）

```typescript
// ✅ 正确 - 文件名: create-job-request.dto.ts（直接在 DTO 中使用装饰器）
/**
 * 创建任务请求 DTO
 * 
 * @business-rule 客户 ID 必填
 * @business-rule 任务项至少一个
 */
export class CreateJobRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '客户ID' })
  customerId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ description: '任务标题' })
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobItemDto)
  @ArrayMinSize(1)
  @ApiProperty({ type: [CreateJobItemDto] })
  items: CreateJobItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ required: false })
  notes?: string;
}

// 文件名: create-job-item.dto.ts
export class CreateJobItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
```

**命名模式**：
- 文件：`[命令/请求].validator.ts` 或直接在 DTO 中使用装饰器

---

## 五、调度器（Scheduler）

```typescript
// ✅ 正确
// 文件名: job-timeout.scheduler.ts
export class JobTimeoutScheduler { }
// 文件名: report-generation.scheduler.ts
export class ReportGenerationScheduler { }
// 文件名: data-retention.scheduler.ts
export class DataRetentionScheduler { }
```

### 5.1 调度器最佳实践

```typescript
// ✅ 正确 - 文件名: job-timeout.scheduler.ts
/**
 * 任务超时调度器
 * 
 * @business-rule 每 5 分钟检查一次超时任务
 * @business-rule 超过 30 分钟未提交的任务自动取消
 */
@Injectable()
export class JobTimeoutScheduler {
  constructor(
    private readonly commandBus: ICommandBus,
    private readonly logger: ILogger
  ) {}

  // 每 5 分钟检查一次超时任务
  @Cron('*/5 * * * *')
  async handleJobTimeout(): Promise<void> {
    this.logger.info('开始检查超时任务');

    const timeoutThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 分钟前
    const timedOutJobs = await this.findTimedOutJobs(timeoutThreshold);

    for (const job of timedOutJobs) {
      try {
        await this.commandBus.execute(new CancelJobCommand({
          jobId: job.id,
          reason: 'JOB_TIMEOUT'
        }));
        this.logger.info('任务因超时已取消', { jobId: job.id });
      } catch (error) {
        this.logger.error('取消超时任务失败', { jobId: job.id, error });
      }
    }
  }

  private async findTimedOutJobs(threshold: Date): Promise<Job[]> {
    // 查询超时任务的逻辑
  }
}
```

**命名模式**：
- 文件：`[功能].scheduler.ts`
- 类：`[功能]Scheduler`

---

## 六、守护进程（Guard）

```typescript
// ✅ 正确
// 文件名: auth.guard.ts
export class AuthGuard implements CanActivate { }
// 文件名: roles.guard.ts
export class RolesGuard implements CanActivate { }
// 文件名: tenant.guard.ts
export class TenantGuard implements CanActivate { }
// 文件名: rate-limit.guard.ts
export class RateLimitGuard implements CanActivate { }
```

### 6.1 Guard 最佳实践

```typescript
// ✅ 正确 - 文件名: roles.guard.ts
/**
 * 角色守卫
 * 
 * @business-rule 检查用户是否具有所需角色
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// ✅ 正确 - 文件名: tenant.guard.ts
/**
 * 租户守卫
 * 
 * @business-rule 确保请求包含有效的租户上下文
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.tenantId && !!request.tenant;
  }
}
```

**命名模式**：
- 文件：`[功能].guard.ts`
- 类：`[功能]Guard`

---

## 七、拦截器（Interceptor）

```typescript
// ✅ 正确
// 文件名: logging.interceptor.ts
export class LoggingInterceptor implements NestInterceptor { }
// 文件名: transform.interceptor.ts
export class TransformInterceptor implements NestInterceptor { }
// 文件名: timeout.interceptor.ts
export class TimeoutInterceptor implements NestInterceptor { }
// 文件名: cache.interceptor.ts
export class CacheInterceptor implements NestInterceptor { }
```

### 7.1 拦截器最佳实践

```typescript
// ✅ 正确 - 文件名: transform.interceptor.ts
/**
 * 响应转换拦截器
 * 
 * @business-rule 统一响应格式
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString()
      }))
    );
  }
}
```

**命名模式**：
- 文件：`[功能].interceptor.ts`
- 类：`[功能]Interceptor`

---

## 八、管道（Pipe）

```typescript
// ✅ 正确
// 文件名: validation.pipe.ts
export class ValidationPipe implements PipeTransform { }
// 文件名: parse-int.pipe.ts
export class ParseIntPipe implements PipeTransform { }
// 文件名: trim.pipe.ts
export class TrimPipe implements PipeTransform { }
```

**命名模式**：
- 文件：`[功能].pipe.ts`
- 类：`[功能]Pipe`

---

## 九、过滤器（Filter）

```typescript
// ✅ 正确
// 文件名: http-exception.filter.ts
export class HttpExceptionFilter implements ExceptionFilter { }
// 文件名: domain-exception.filter.ts
export class DomainExceptionFilter implements ExceptionFilter { }
```

### 9.1 过滤器最佳实践

```typescript
// ✅ 正确 - 文件名: http-exception.filter.ts
/**
 * HTTP 异常过滤器
 * 
 * @business-rule 统一异常响应格式
 * @business-rule 记录异常日志
 */
@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = exception instanceof HttpException
      ? exception.message
      : '内部服务器错误';

    this.logger.error('请求异常', {
      path: request.url,
      method: request.method,
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined
    });

    response.status(status).json({
      success: false,
      error: {
        code: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url
      }
    });
  }
}
```

**命名模式**：
- 文件：`[功能].filter.ts`
- 类：`[功能]Filter`

---

## 目录结构示例

```
apps/api/src/interface/
├── controllers/
│   ├── job.controller.ts
│   ├── tenant.controller.ts
│   └── auth.controller.ts
├── resolvers/
│   ├── job.resolver.ts
│   └── tenant.resolver.ts
├── middlewares/
│   ├── tenant.middleware.ts
│   └── request-logging.middleware.ts
├── guards/
│   ├── auth.guard.ts
│   ├── roles.guard.ts
│   └── tenant.guard.ts
├── interceptors/
│   ├── logging.interceptor.ts
│   ├── transform.interceptor.ts
│   └── timeout.interceptor.ts
├── pipes/
│   ├── validation.pipe.ts
│   └── trim.pipe.ts
├── filters/
│   ├── http-exception.filter.ts
│   └── domain-exception.filter.ts
├── schedulers/
│   ├── job-timeout.scheduler.ts
│   └── report-generation.scheduler.ts
└── dtos/
    ├── create-job-request.dto.ts
    ├── job-response.dto.ts
    └── paged-result.dto.ts
```

---

[下一章：共享模块命名规范 →](./spec-06-shared.md)
