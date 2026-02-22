# Novu API 层与 NestJS 模块组织研究报告

## 1. API 应用结构

### 1.1 目录结构概览

```
apps/api/src/
├── app.module.ts              # 主模块（统一注册 50+ 模块）
├── bootstrap.ts               # 应用启动配置
├── main.ts                    # 入口文件
├── exception-filter.ts        # 全局异常过滤器
├── error-dto.ts               # 错误响应 DTO
├── config/                    # 配置模块
│
└── app/                       # 业务模块目录
    ├── activity/              # 活动记录
    ├── analytics/             # 分析服务
    ├── auth/                  # 认证授权
    ├── blueprint/             # 蓝图管理
    ├── bridge/                # Bridge 集成
    ├── change/                # 变更追踪
    ├── channel-connections/   # 渠道连接
    ├── channel-endpoints/     # 渠道端点
    ├── content-templates/     # 内容模板
    ├── contexts/              # 上下文管理
    ├── environments-v1/       # 环境管理 v1
    ├── environments-v2/       # 环境管理 v2
    ├── events/                # 事件触发
    ├── execution-details/     # 执行详情
    ├── feeds/                 # Feed 管理
    ├── health/                # 健康检查
    ├── inbound-parse/         # 入站解析
    ├── inbox/                 # Inbox 功能
    ├── integrations/          # 集成管理
    ├── internal/              # 内部 API
    ├── invites/               # 邀请管理
    ├── layouts-v1/            # 布局 v1
    ├── layouts-v2/            # 布局 v2
    ├── messages/              # 消息管理
    ├── notification-groups/   # 通知分组
    ├── notifications/         # 通知管理
    ├── organization/          # 组织管理
    ├── outbound-webhooks/     # 出站 Webhook
    ├── partner-integrations/  # 合作伙伴集成
    ├── preferences/           # 偏好设置
    ├── rate-limiting/         # 限流控制
    ├── shared/                # 共享模块
    ├── storage/               # 存储服务
    ├── subscribers/           # 订阅者 v1
    ├── subscribers-v2/        # 订阅者 v2
    ├── subscriptions/         # 订阅管理
    ├── support/               # 支持服务
    ├── tenant/                # 租户管理
    ├── testing/               # 测试模块
    ├── topics-v1/             # 主题 v1
    ├── topics-v2/             # 主题 v2
    ├── translations/          # 翻译服务
    ├── user/                  # 用户管理
    ├── widgets/               # Widget 功能
    ├── workflow-overrides/    # 工作流覆盖
    ├── workflows-v1/          # 工作流 v1
    └── workflows-v2/          # 工作流 v2
```

### 1.2 模块注册策略

```typescript
const baseModules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  AuthModule,
  InboundParseModule,
  SharedModule,
  HealthModule,
  EnvironmentsModuleV1,
  ExecutionDetailsModule,
  WorkflowModuleV1,
  EventsModule,
  WidgetsModule,
  InboxModule,
  // ... 共 30+ 模块
];

// 企业级模块动态加载
const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
      modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
    }
    if (require('@novu/ee-billing')?.BillingModule) {
      modules.push(require('@novu/ee-billing')?.BillingModule.forRoot());
    }
  }
  return modules;
};
```

### 1.3 模块组织特点

| 特点 | 说明 |
|------|------|
| **领域驱动** | 按业务领域划分模块 |
| **版本并存** | v1/v2 模块共存，支持渐进式迁移 |
| **Monorepo 架构** | libs/ 存放共享库，packages/ 存放发布包 |
| **动态模块加载** | 企业级模块按需加载 |
| **全局提供者** | APP_GUARD, APP_INTERCEPTOR 注册全局守卫和拦截器 |

---

## 2. NestJS 模式

### 2.1 Controller 设计模式

```typescript
@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)  // 限流分类
@ResourceCategory(ResourceEnum.EVENTS)                 // 资源分类
@RequireAuthentication()                               // 认证要求
@ApiCommonResponses()                                  // 通用 API 响应
@Controller({
  path: 'events',
  scope: Scope.REQUEST,                                // 请求作用域
})
@ApiTags('Events')
export class EventsController {
  constructor(
    private cancelDelayedUsecase: CancelDelayed,
    private triggerEventToAll: TriggerEventToAll,
    // ... 通过构造函数注入 Usecase
  ) {}
}
```

**Controller 装饰器层次结构：**

```
类级别装饰器:
├── @ThrottlerCategory()    - 限流分类
├── @ResourceCategory()     - 资源分类（计费）
├── @RequireAuthentication() - 认证要求
├── @ApiCommonResponses()   - Swagger 通用响应
├── @Controller()           - 路由配置
└── @ApiTags()              - Swagger 分组

方法级别装饰器:
├── @ExternalApiAccessible() - 外部 API 可访问
├── @ThrottlerCost()         - 限流成本
├── @LogAnalytics()          - 分析日志
├── @Post/@Get/@Put/@Delete  - HTTP 方法
├── @ApiOperation()          - API 描述
├── @ApiResponse()           - 响应类型
├── @SdkMethodName()         - SDK 方法名
└── @RequirePermissions()    - 权限要求
```

### 2.2 Service 层组织（Usecase 模式）

```typescript
// Command 定义
export class LoginCommand extends BaseCommand {
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}

// Usecase 实现
@Injectable()
export class Login {
  private BLOCKED_PERIOD_IN_MINUTES = 5;
  private MAX_LOGIN_ATTEMPTS = 5;

  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private analyticsService: AnalyticsService,
    private organizationRepository: OrganizationRepository
  ) {}

  async execute(command: LoginCommand) {
    // 业务逻辑实现
  }
}
```

### 2.3 Dependency Injection 使用

```typescript
// 字符串 Token 注入
constructor(@Inject('AUTH_SERVICE') private authService: IAuthService) {}

// 提供 Token 定义
const userRepositoryProvider = {
  provide: 'USER_REPOSITORY',
  useClass: CommunityUserRepository,
};

// 动态提供者
function getDynamicAuthProviders() {
  if (isClerkEnabled()) {
    return require('@novu/ee-auth').injectEEAuthProviders();
  } else {
    return [
      { provide: 'USER_REPOSITORY', useClass: CommunityUserRepository },
      { provide: 'MEMBER_REPOSITORY', useClass: CommunityMemberRepository },
    ];
  }
}
```

### 2.4 Guard 策略

| Guard | 职责 | 作用范围 |
|-------|------|---------|
| `AnalyticsLogsGuard` | 设置分析日志标志 | 全局 |
| `CommunityUserAuthGuard` | JWT/API Key 认证 | 方法级 |
| `RootEnvironmentGuard` | 根环境权限检查 | 方法级 |

**AnalyticsLogsGuard 实现：**

```typescript
@Injectable()
export class AnalyticsLogsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const shouldLogAnalytics = this.shouldLogAnalytics(context);
    if (shouldLogAnalytics) {
      const request = context.switchToHttp().getRequest();
      request._shouldLogAnalytics = true;  // 为 Filter 设置标志
    }
    return true;  // 永不阻止请求
  }
}
```

**CommunityUserAuthGuard 实现：**

```typescript
@Injectable()
export class CommunityUserAuthGuard extends AuthGuard([
  PassportStrategyEnum.JWT,
  PassportStrategyEnum.HEADER_API_KEY
]) {
  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions<any> {
    const authScheme = authorizationHeader?.split(' ')[0];
    
    switch (authScheme) {
      case ApiAuthSchemeEnum.BEARER:
        return { defaultStrategy: PassportStrategyEnum.JWT };
      case ApiAuthSchemeEnum.API_KEY:
        return { defaultStrategy: PassportStrategyEnum.HEADER_API_KEY };
      default:
        throw new UnauthorizedException('Missing authorization header');
    }
  }
}
```

### 2.5 Interceptor 策略

| Interceptor | 职责 | 执行顺序 |
|-------------|------|---------|
| `ResponseInterceptor` | 统一响应格式 | 1 (bootstrap) |
| `ApiRateLimitInterceptor` | API 限流 | 2 (全局) |
| `ProductFeatureInterceptor` | 产品特性检查 | 3 (全局) |
| `IdempotencyInterceptor` | 幂等性控制 | 4 (全局) |
| `AnalyticsLogsInterceptor` | 分析日志记录 | 5 (全局) |

**ResponseInterceptor 实现：**

```typescript
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        data: isObject(data) ? this.transformResponse(data) : data,
      }))
    );
  }
}
```

**IdempotencyInterceptor 核心逻辑：**

```typescript
async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
  const idempotencyKey = this.getIdempotencyKey(context);
  const cacheKey = this.getCacheKey(context);
  
  const isNewReq = await this.setCache(cacheKey, { status: 'in-progress', bodyHash });
  
  if (isNewReq) {
    return next.handle().pipe(
      map(async (response) => {
        await this.setCache(cacheKey, { status: 'success', data: response });
        return response;
      }),
      catchError((err) => {
        this.setCache(cacheKey, { status: 'error', data: err });
        throw err;
      })
    );
  } else {
    // 返回缓存响应
    return of(parsed.data);
  }
}
```

---

## 3. API 设计

### 3.1 RESTful API 规范

```
GET    /v2/workflows           # 列表查询
POST   /v2/workflows           # 创建资源
GET    /v2/workflows/:id       # 单条查询
PUT    /v2/workflows/:id       # 全量更新
PATCH  /v2/workflows/:id       # 部分更新
DELETE /v2/workflows/:id       # 删除资源
POST   /v2/workflows/:id/duplicate  # 自定义操作
```

### 3.2 版本控制策略

**Bootstrap 配置：**

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  prefix: `${CONTEXT_PATH}v`,
  defaultVersion: '1',
});
```

**Controller 版本声明：**

```typescript
// V1 - 默认版本
@Controller('/workflows')
export class WorkflowControllerV1 {}

// V2 - 显式版本
@Controller({ path: `/workflows`, version: '2' })
export class WorkflowController {}
```

**版本共存模块结构：**

```
workflows-v1/
├── workflow-v1.controller.ts
├── workflow-v1.module.ts
└── usecases/

workflows-v2/
├── workflow.controller.ts
├── workflow.module.ts
└── usecases/
```

### 3.3 DTO 与验证

**请求 DTO 示例：**

```typescript
export class CreateWorkflowDto extends WorkflowCommonsFields {
  @ApiProperty({ description: 'Unique identifier for the workflow' })
  @IsString()
  @Matches(/^[a-zA-Z0-9]+(?:[-_.][a-zA-Z0-9]+)*$/, {
    message: 'workflowId must be a valid slug format',
  })
  workflowId: string;

  @ApiProperty({
    description: 'Steps of the workflow',
    type: 'array',
    items: { oneOf: [...] },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseStepConfigDto, {
    discriminator: { property: 'type', subTypes: [...] },
  })
  steps: StepUpsertDto[];

  @ApiPropertyOptional({
    description: 'Workflow preferences',
    type: PreferencesRequestDto,
  })
  @IsOptional()
  @Type(() => PreferencesRequestDto)
  preferences?: PreferencesRequestDto;
}
```

**响应 DTO 示例：**

```typescript
@ApiExtraModels(RuntimeIssueDto, StepResponseDto, ...)
export class WorkflowResponseDto extends WorkflowCommonsFields {
  @ApiProperty({ description: 'Database identifier of the workflow' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'Workflow identifier' })
  @IsString()
  workflowId: string;

  @ApiProperty({
    description: 'Steps of the workflow',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(InAppStepResponseDto) },
        { $ref: getSchemaPath(EmailStepResponseDto) },
        // ...
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          [StepTypeEnum.IN_APP]: getSchemaPath(InAppStepResponseDto),
          // ...
        },
      },
    },
  })
  steps: StepResponseDto[];
}
```

### 3.4 Swagger 文档

**文档配置：**

```typescript
export const setupSwagger = async (app: INestApplication, internalSdkGeneration?: boolean) => {
  const options = new DocumentBuilder()
    .setTitle('Novu API')
    .setDescription('Novu REST API')
    .setVersion(packageJson.version)
    .addServer('https://api.novu.co')
    .addServer('https://eu.api.novu.co')
    .addSecurity(API_KEY_SWAGGER_SECURITY_NAME, {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
    })
    .addTag('Events', 'Events represent a change in state...')
    .addTag('Workflows', 'All notifications are sent via a workflow...')
    // ...
    .build();

  const document = SwaggerModule.createDocument(app, options, {
    deepScanRoutes: true,
    extraModels: [...webhookPayloadDtos],
  });

  // 发布多个文档版本
  SwaggerModule.setup('api', app, document);           // UI 界面
  SwaggerModule.setup('openapi', app, document);       // OpenAPI 规范
  SwaggerModule.setup('openapi.sdk', app, sdkDocument); // SDK 专用
};
```

**自定义响应装饰器：**

```typescript
export const ApiResponse = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
  statusCode: number = 200,
  isResponseArray = false,
  shouldEnvelope = true,
) => {
  return applyDecorators(
    ApiExtraModels(DataWrapperDto, dataDto),
    responseDecoratorFunction({
      schema: shouldEnvelope
        ? { properties: { data: { $ref: getSchemaPath(dataDto) } } }
        : { $ref: getSchemaPath(dataDto) },
    })
  );
};
```

---

## 4. 认证授权

### 4.1 Auth 模块架构

```
auth/
├── auth.module.ts                    # 动态模块配置
├── auth.controller.ts                # 认证端点
├── community.auth.module.config.ts   # 社区版配置
├── ee.auth.module.config.ts          # 企业版配置
├── framework/
│   ├── auth.decorator.ts             # @RequireAuthentication()
│   ├── community.user.auth.guard.ts  # 社区版 Guard
│   └── root-environment-guard.service.ts
├── services/
│   ├── auth.service.ts               # 认证服务接口
│   ├── community.auth.service.ts     # 社区版实现
│   └── passport/
│       ├── jwt.strategy.ts           # JWT 策略
│       ├── apikey.strategy.ts        # API Key 策略
│       ├── github.strategy.ts        # GitHub OAuth
│       └── subscriber-jwt.strategy.ts # 订阅者 JWT
└── usecases/
    ├── login/
    ├── register/
    ├── password-reset/
    └── switch-organization/
```

### 4.2 JWT 策略

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private environmentRepository: EnvironmentRepository
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: http.IncomingMessage, session: UserSessionData) {
    session.scheme = ApiAuthSchemeEnum.BEARER;
    const user = await this.authService.validateUser(session);
    if (!user) throw new UnauthorizedException();
    
    const environmentId = this.resolveEnvironmentId(req, session);
    session.environmentId = environmentId;
    
    return session;
  }
}
```

### 4.3 API Key 策略

```typescript
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {
    super(
      { header: 'Authorization', prefix: 'ApiKey ' },
      true,
      async (apikey: string, verified) => {
        const user = await this.validateApiKey(apikey);
        return verified(null, user || false);
      }
    );
  }

  private async validateApiKey(apiKey: string): Promise<UserSessionData | null> {
    const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');
    
    // LRU 缓存优化
    return this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.API_KEY_USER,
      hashedApiKey,
      () => this.authService.getUserByApiKey(apiKey)
    );
  }
}
```

### 4.4 Clerk 集成

```typescript
export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const eeAuthModule = eeAuthPackage?.eeAuthModule;

  return {
    imports: [...eeAuthModule.imports],
    controllers: [...eeAuthModule.controllers],
    providers: [
      ...eeAuthModule.providers,
      ApiKeyStrategy,      // 复用 API Key 策略
      JwtSubscriberStrategy,
      AuthService,
    ],
    exports: [...eeAuthModule.exports, AuthService],
  };
}
```

### 4.5 RBAC 实现

**权限装饰器：**

```typescript
// 使用示例
@RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
async create(@Body() body: CreateWorkflowDto) {}

// 装饰器定义（来自 @novu/application-generic）
export const RequirePermissions = (...permissions: PermissionsEnum[]) => {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(PermissionsGuard),
  );
};
```

**权限枚举：**

```typescript
export enum PermissionsEnum {
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_WRITE = 'workflow:write',
  EVENT_WRITE = 'event:write',
  SUBSCRIBER_READ = 'subscriber:read',
  SUBSCRIBER_WRITE = 'subscriber:write',
  // ...
}
```

---

## 5. 模块关系图

```
                                    ┌─────────────────────────────────────┐
                                    │            AppModule                │
                                    │  (统一注册 50+ 业务模块)              │
                                    └──────────────┬──────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
           ┌────────▼────────┐            ┌───────▼───────┐            ┌─────────▼─────────┐
           │   SharedModule  │            │   AuthModule  │            │  RateLimitingModule │
           │  (共享基础设施)   │            │  (认证授权)    │            │    (限流控制)        │
           └────────┬────────┘            └───────┬───────┘            └─────────────────────┘
                    │                             │
      ┌─────────────┼─────────────┐              │
      │             │             │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐  ┌─────▼─────┐
│ DalService│ │QueuesModule│ │LoggerModule│  │JwtStrategy│
│  (MongoDB) │ │  (BullMQ) │ │  (Pino)   │  │ApiKeyStrat│
└───────────┘ └───────────┘ └───────────┘  └───────────┘

业务模块层级关系:
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  WorkflowsModule ──────┬─────── EventsModule ──────── SubscribersModule        │
│        │               │              │                   │                    │
│        ├── LayoutsModule              │                   │                    │
│        ├── MessageTemplateModule      │                   │                    │
│        ├── IntegrationModule ─────────┘                   │                    │
│        ├── BridgeModule                                   │                    │
│        └── ChangeModule                                   │                    │
│                                                           │                    │
│  EnvironmentsModule ───────────────────────────────────────                    │
│        │                                                                       │
│        └── OrganizationModule                                                  │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 关键设计模式总结

| 模式 | 应用场景 | 示例 |
|------|---------|------|
| **Usecase 模式** | 业务逻辑封装 | `Login`, `CreateWorkflow`, `TriggerEvent` |
| **Command 模式** | 请求参数封装 | `LoginCommand`, `CreateWorkflowCommand` |
| **Strategy 模式** | 认证策略切换 | `JwtStrategy`, `ApiKeyStrategy` |
| **Decorator 模式** | 功能增强组合 | `@RequireAuthentication()`, `@LogAnalytics()` |
| **Guard 模式** | 前置条件检查 | `AnalyticsLogsGuard`, `CommunityUserAuthGuard` |
| **Interceptor 模式** | 请求/响应处理 | `ResponseInterceptor`, `IdempotencyInterceptor` |
| **Factory 模式** | 动态模块创建 | `getModuleConfig()`, `getDynamicAuthProviders()` |
| **Proxy 模式** | 服务代理 | `AuthService` 代理 `IAuthService` 实现 |

---

## 7. 最佳实践建议

1. **模块划分**: 按业务领域划分，支持版本共存
2. **认证架构**: 双策略支持（JWT + API Key），便于内部/外部 API 共用
3. **API 限流**: 基于分类和成本的多维度限流
4. **幂等性控制**: 基于缓存的请求去重
5. **文档生成**: 多文档版本（UI、OpenAPI、SDK 专用）
6. **企业级隔离**: 社区版/企业版模块动态加载

---

*报告生成时间：2026-02-22*
