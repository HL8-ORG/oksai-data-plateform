# Novu 多租户实现与 Workflow 引擎设计研究报告

## 一、多租户实现

### 1.1 租户模型

Novu 采用 **三层租户隔离模型**：Organization → Environment → Tenant

```
┌─────────────────────────────────────────────────────────────┐
│                     Organization (组织)                      │
│  - 最高级别的隔离单位                                         │
│  - 包含品牌配置、计费信息、服务等级                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │   Environment    │    │   Environment    │               │
│  │   (Development)  │    │   (Production)   │               │
│  │   - API Keys     │    │   - API Keys     │               │
│  │   - Integrations │    │   - Integrations │               │
│  └────────┬─────────┘    └────────┬─────────┘               │
│           │                       │                          │
│  ┌────────▼─────────┐    ┌────────▼─────────┐               │
│  │   Tenants        │    │   Tenants        │               │
│  │   (客户A)        │    │   (客户B)        │               │
│  └──────────────────┘    └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Organization 实体设计

```typescript
export class OrganizationEntity {
  _id: string;
  name: string;
  logo?: string;
  apiServiceLevel: ApiServiceLevelEnum;  // FREE/UNLIMITED/ENTERPRISE
  isTrial?: boolean;
  branding?: Branding;
  partnerConfigurations?: IPartnerConfiguration[];
  defaultLocale?: string;
  targetLocales?: string[];
  productUseCases?: ProductUseCases;      // delay/digest/translation 开关
}
```

### 1.3 Environment 隔离策略

```typescript
export class EnvironmentEntity {
  _id: string;
  name: string;
  _organizationId: OrganizationId;
  _parentId: string;                       // 父环境 ID
  identifier: string;
  type: EnvironmentTypeEnum;              // PRODUCTION/DEVELOPMENT
  apiKeys: IApiKey[];
  apiRateLimits?: IApiRateLimitMaximum;
}
```

### 1.4 数据隔离 - BaseRepository 泛型

```typescript
// 通过泛型强制查询包含租户字段
export class BaseRepository<T_DBModel, T_MappedEntity, T_Enforcement> {
  async findOne(
    query: FilterQuery<T_DBModel> & T_Enforcement  // 强制包含隔离字段
  ): Promise<T_MappedEntity | null> {
    return this.MongooseModel.findOne(query);
  }
}

// 具体实现强制 EnforceEnvId
export class TenantRepository extends BaseRepository<TenantDBModel, TenantEntity, EnforceEnvId> {}

// 类型定义确保查询必须包含 _environmentId
export type EnforceEnvId = { _environmentId: string };
```

### 1.5 RBAC 权限模型

```typescript
export enum MemberRoleEnum {
  OWNER = 'owner',
  ADMIN = 'admin',
  AUTHOR = 'author',
  VIEWER = 'viewer',
}

export enum PermissionsEnum {
  WORKFLOW_READ = 'org:workflow:read',
  WORKFLOW_WRITE = 'org:workflow:write',
  EVENT_WRITE = 'org:event:write',
  INTEGRATION_READ = 'org:integration:read',
  INTEGRATION_WRITE = 'org:integration:write',
}

// 使用示例
@RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
async create(@Body() body: CreateWorkflowDto) {}
```

---

## 二、Workflow 引擎

### 2.1 Workflow 设计

```typescript
export type ExecuteInput<T_Payload, T_Controls> = {
  step: Step;                    // 步骤定义函数
  payload: T_Payload;            // 触发时提供的 Payload
  subscriber: Subscriber;        // 订阅者信息
  environment: Record<string, unknown>;
  controls: T_Controls;          // Dashboard 控制变量
  context: ContextResolved;      // 解析后的上下文
};

export type WorkflowOptions<T_PayloadSchema, T_ControlSchema> = {
  payloadSchema?: T_PayloadSchema;
  controlSchema?: T_ControlSchema;
  preferences?: WorkflowPreferences;
  tags?: string[];
  name?: string;
  description?: string;
  severity?: SeverityLevelEnum;
};
```

### 2.2 Step 类型系统

```typescript
export enum ChannelStepEnum {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  CHAT = 'chat',
  IN_APP = 'in_app',
}

export enum ActionStepEnum {
  DIGEST = 'digest',      // 消息聚合
  DELAY = 'delay',        // 延迟
  THROTTLE = 'throttle',  // 限流
  CUSTOM = 'custom',      // 自定义
}

export type Step = {
  email: ChannelStep<...>;
  sms: ChannelStep<...>;
  push: ChannelStep<...>;
  chat: ChannelStep<...>;
  inApp: ChannelStep<...>;
  digest: ActionStep<...>;
  delay: ActionStep<...>;
  throttle: ActionStep<...>;
  custom: CustomStep;
};
```

### 2.3 模板引擎 - LiquidJS

```typescript
import { Liquid } from 'liquidjs';

export function createLiquidEngine(options?: LiquidOptions): Liquid {
  const liquidEngine = new Liquid({
    outputEscape: defaultOutputEscape,
    ...options,
  });

  // 注册内置过滤器
  liquidEngine.registerFilter('digest', digest);      // 消息聚合
  liquidEngine.registerFilter('toSentence', toSentence);
  liquidEngine.registerFilter('pluralize', pluralize);

  return liquidEngine;
}
```

### 2.4 Delay 处理

```typescript
// Delay 有三种模式
export const delayOutputSchema = {
  oneOf: [
    // 1. 固定时间延迟
    {
      type: 'object',
      properties: {
        type: { enum: ['regular'] },
        amount: { type: 'number' },
        unit: { enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'] },
      },
    },
    // 2. 定时执行 (Cron)
    {
      type: 'object',
      properties: {
        type: { enum: ['timed'] },
        cron: { type: 'string' },
      },
    },
    // 3. 动态延迟
    {
      type: 'object',
      properties: {
        type: { enum: ['dynamic'] },
        dynamicKey: { type: 'string' },
      },
    },
  ],
};
```

### 2.5 Digest 合并

```typescript
// Digest 配置
{
  type: 'regular',
  amount: 5,
  unit: 'minutes',
  digestKey: 'orderId',           // 聚合键
  lookBackWindow: {               // 回溯窗口
    amount: 1,
    unit: 'hours',
  },
}

// Digest 结果
{
  eventCount: 3,
  events: [
    { id: 'evt1', time: '2024-01-01T10:00:00Z', payload: {...} },
    { id: 'evt2', time: '2024-01-01T10:02:00Z', payload: {...} },
    { id: 'evt3', time: '2024-01-01T10:04:00Z', payload: {...} },
  ],
}
```

---

## 三、Blueprint 系统

### 3.1 架构设计

Blueprint 系统是一个特殊组织，存储预定义的通知模板：

```
┌─────────────────────────────────────────────────────────────┐
│              Blueprint Organization                          │
│              (特殊组织，存储预定义模板)                        │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            Notification Templates                    │   │
│   │   - Welcome Email                                   │   │
│   │   - Password Reset                                  │   │
│   │   - Order Confirmation                              │   │
│   │   - Two-Factor Authentication                       │   │
│   │   - ...                                             │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

API 端点:
GET /blueprints/group-by-category
GET /blueprints/:templateIdOrIdentifier
```

### 3.2 Blueprint Controller

```typescript
@Controller('/blueprints')
export class BlueprintController {
  @Get('/group-by-category')
  async getGroupedBlueprints(): Promise<GroupedBlueprintResponse> {
    const prodEnvironmentId = await this.getProdEnvironmentId();
    return this.getGroupedBlueprintsUsecase.execute(
      GetGroupedBlueprintsCommand.create({ environmentId: prodEnvironmentId })
    );
  }

  @Get('/:templateIdOrIdentifier')
  getBlueprintById(@Param('templateIdOrIdentifier') templateIdOrIdentifier: string) {
    return this.getBlueprintUsecase.execute(
      GetBlueprintCommand.create({ templateIdOrIdentifier })
    );
  }
}
```

---

## 四、关键设计总结

### 4.1 多租户设计亮点

| 特性 | 实现 |
|:---|:---|
| **三层隔离** | Organization → Environment → Tenant |
| **类型安全** | TypeScript 泛型 `T_Enforcement` |
| **RBAC 权限** | MemberRole + Permissions |
| **软删除** | mongoose-delete 插件 |

### 4.2 Workflow 引擎设计亮点

| 特性 | 实现 |
|:---|:---|
| **类型安全步骤** | 泛型 Step 类型 |
| **LiquidJS 模板** | 自定义过滤器 |
| **Digest 聚合** | 事件合并机制 |
| **Delay 调度** | Cron + 固定时间 |
| **Blueprint 系统** | 预定义模板 |

### 4.3 可借鉴的设计模式

1. **Repository 模式 + 泛型约束**：确保数据隔离
2. **Command 模式**：封装业务操作
3. **装饰器模式**：用户会话注入
4. **策略模式**：多种认证方式
5. **模板方法模式**：Workflow 执行流程

---

*报告生成时间：2026-02-22*
