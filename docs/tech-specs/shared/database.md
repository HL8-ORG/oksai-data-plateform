# Database 模块技术规范

> 版本：2.0.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/database` 提供基于 MikroORM 的数据库访问基础设施，包括：

- **MikroORM 集成**：PostgreSQL 驱动的 MikroORM 模块装配
- **租户感知仓储**：自动注入 tenantId 过滤条件，确保多租户数据隔离
- **租户感知服务**：封装常用 CRUD 操作的服务基类
- **插件元数据聚合**：从插件中聚合实体和订阅者到 MikroORM 配置

### 1.2 技术栈

- **ORM**：MikroORM 6.x
- **数据库**：PostgreSQL
- **框架**：NestJS 11.x
- **驱动**：pg (node-postgres)

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/database/
├── lib/
│   ├── adapters/
│   │   ├── mikro-orm.module.ts           # MikroORM 模块装配
│   │   └── mikro-orm-options.adapter.ts  # 插件元数据聚合
│   ├── config/
│   │   └── mikro-orm.config.ts           # MikroORM 配置注册
│   ├── repositories/
│   │   └── tenant-aware.repository.ts    # 租户感知仓储
│   └── services/
│       └── tenant-aware.service.ts       # 租户感知服务基类
├── spec/
│   ├── mikro-orm-options.adapter.spec.ts
│   ├── tenant-aware.repository.spec.ts
│   └── tenant-aware.service.spec.ts
└── index.ts
```

### 2.2 核心组件架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│                    (Plugin / Domain Module)                  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   TenantAwareService<T>                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ findOne()   │  │ create()    │  │ update/delete/count │  │
│  │ findAll()   │  │ createMany()│  │ exists/deleteMany   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  + Lifecycle Hooks: beforeCreate/afterCreate/...            │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               createTenantAwareRepository<T>()               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 自动注入 tenantId 过滤条件                              │  │
│  │ 禁止客户端覆盖 tenantId                                 │  │
│  │ 禁止修改实体的 tenantId                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    MikroORM (PostgreSQL)                     │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ EntityManager   │  │ EntityRepository<T>             │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、配置选项

### 3.1 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DB_HOST` | ✅ | - | 数据库主机地址 |
| `DB_PORT` | ❌ | 5432 | 数据库端口 |
| `DB_NAME` | ✅ | - | 数据库名称 |
| `DB_USER` | ✅ | - | 用户名 |
| `DB_PASS` | ✅ | - | 密码 |
| `DB_SSL` | ❌ | false | 是否启用 SSL |

### 3.2 MikroOrmConfig 接口

```typescript
interface MikroOrmConfig {
  host: string;
  port: number;
  dbName: string;
  user: string;
  password: string;
  ssl: boolean;
}
```

---

## 四、使用方式

### 4.1 模块装配

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@oksai/config';
import { setupMikroOrmModule, createMikroOrmConfig } from '@oksai/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [createMikroOrmConfig],
    }),
    setupMikroOrmModule(),
  ],
})
export class AppModule {}
```

### 4.2 自定义 MikroORM 配置

```typescript
import { setupMikroOrmModule } from '@oksai/database';

setupMikroOrmModule({
  override: {
    debug: true,  // 开发环境启用调试
  },
});
```

### 4.3 定义租户感知实体

```typescript
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ITenantAwareEntity } from '@oksai/database';

@Entity()
export class Job implements ITenantAwareEntity {
  @PrimaryKey()
  id!: string;

  @Property()
  tenantId!: string;

  @Property()
  title!: string;

  @Property()
  status!: string;
}
```

### 4.4 使用租户感知仓储

```typescript
import { createTenantAwareRepository, type ITenantContextService } from '@oksai/database';
import type { EntityManager } from '@mikro-orm/core';
import { Job } from './job.entity';

class JobService {
  private readonly repo: ITenantAwareRepository<Job>;

  constructor(em: EntityManager, ctx: ITenantContextService) {
    this.repo = createTenantAwareRepository(ctx, em.getRepository(Job));
  }

  async findById(id: string) {
    return this.repo.findOne(id);  // 自动注入 tenantId
  }

  async create(data: { title: string }) {
    return this.repo.create({ ...data });  // 自动注入 tenantId
  }
}
```

### 4.5 使用租户感知服务基类

```typescript
import { TenantAwareService, type ITenantContextService } from '@oksai/database';
import type { EntityManager } from '@mikro-orm/core';
import { Job } from './job.entity';

class JobService extends TenantAwareService<Job> {
  constructor(em: EntityManager, ctx: ITenantContextService) {
    super(em, ctx, Job);
  }

  // 可选：重写钩子方法
  protected override async beforeCreate(data: RequiredEntityData<Job>) {
    console.log('创建前验证:', data);
  }

  protected override async afterCreate(entity: Job) {
    console.log('创建后处理:', entity);
  }
}

// 使用
const job = await jobService.create({ title: '新任务' });
const found = await jobService.findOne('job-001');
const all = await jobService.findAll({ status: 'active' });
```

### 4.6 插件元数据聚合

```typescript
import { composeMikroOrmOptionsFromPlugins } from '@oksai/database';
import { PluginA, PluginB } from './plugins';

const options = composeMikroOrmOptionsFromPlugins({
  base: {
    entities: [CoreEntity],
    subscribers: [CoreSubscriber],
  },
  plugins: [PluginA, PluginB],
  detectConflicts: true,  // 默认 true，检测类名冲突
});
```

---

## 五、API 参考

### 5.1 配置

```typescript
// 创建 MikroORM 配置对象
function createMikroOrmConfig(): { db: MikroOrmConfig };

// @deprecated 使用 createMikroOrmConfig 代替
function registerMikroOrmConfig(): () => { db: MikroOrmConfig };

interface MikroOrmConfig {
  host: string;
  port: number;
  dbName: string;
  user: string;
  password: string;
  ssl: boolean;
}
```

### 5.2 模块

```typescript
// 装配 MikroORM 模块
function setupMikroOrmModule(options?: SetupMikroOrmModuleOptions): MaybePromise<DynamicModule>;

interface SetupMikroOrmModuleOptions {
  override?: Partial<MikroOrmModuleOptions>;
}
```

### 5.3 租户感知仓储

```typescript
// 创建租户感知仓储
function createTenantAwareRepository<T extends ITenantAwareEntity>(
  ctx: ITenantContextService,
  repo: EntityRepository<T>
): ITenantAwareRepository<T>;

// 实体 ID 类型
type ID = string | number;

// 租户感知实体接口
interface ITenantAwareEntity {
  id?: ID;
  tenantId: string;
}

// 租户上下文服务接口
interface ITenantContextService {
  getTenantId(): string | undefined;
}

// 租户感知仓储接口
interface ITenantAwareRepository<T extends ITenantAwareEntity> {
  findOne(id: ID): Promise<T | null>;
  findOneBy(where: FilterQuery<T>): Promise<T | null>;
  findAll(where?: FilterQuery<T>): Promise<T[]>;
  find(where?: FilterQuery<T>): Promise<T[]>;
  create(data: RequiredEntityData<T>): Promise<T>;
  createMany(dataList: RequiredEntityData<T>[]): Promise<T[]>;
  update(id: ID, data: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  count(where?: FilterQuery<T>): Promise<number>;
  exists(where: FilterQuery<T>): Promise<boolean>;
}
```

### 5.4 租户感知服务

```typescript
// 租户感知服务基类
abstract class TenantAwareService<T extends ITenantAwareEntity> {
  protected readonly repo: ITenantAwareRepository<T>;

  protected constructor(
    em: EntityManager,
    ctx: ITenantContextService,
    entityClass: new () => T
  );

  // 租户上下文
  protected requireTenantId(): string;
  protected getTenantId(): string;

  // 查询方法
  findOne(id: ID): Promise<T | null>;
  findOneBy(where: FilterQuery<T>): Promise<T | null>;
  findAll(where?: FilterQuery<T>, options?: { offset?: number; limit?: number }): Promise<T[]>;

  // 创建方法（支持钩子）
  create(data: RequiredEntityData<T>): Promise<T>;
  createMany(dataList: RequiredEntityData<T>[]): Promise<T[]>;

  // 更新方法（支持钩子）
  update(id: ID, data: Partial<T>): Promise<T | null>;

  // 删除方法（支持钩子）
  delete(id: ID): Promise<boolean>;
  deleteMany(where: FilterQuery<T>): Promise<number>;

  // 统计方法
  count(where?: FilterQuery<T>): Promise<number>;
  exists(where: FilterQuery<T>): Promise<boolean>;

  // 生命周期钩子（可重写）
  protected beforeCreate(data: RequiredEntityData<T>): Promise<void>;
  protected afterCreate(entity: T): Promise<void>;
  protected beforeCreateMany(dataList: RequiredEntityData<T>[]): Promise<void>;
  protected afterCreateMany(entities: T[]): Promise<void>;
  protected beforeUpdate(id: ID, data: Partial<T>): Promise<void>;
  protected afterUpdate(entity: T): Promise<void>;
  protected beforeDelete(id: ID): Promise<void>;
  protected afterDelete(id: ID): Promise<void>;
}
```

### 5.5 插件元数据聚合

```typescript
// 聚合插件元数据到 MikroORM 配置
function composeMikroOrmOptionsFromPlugins(
  input: ComposeMikroOrmOptionsFromPluginsInput
): Partial<MikroOrmModuleOptions>;

interface ComposeMikroOrmOptionsFromPluginsInput {
  base?: Partial<MikroOrmModuleOptions>;
  plugins?: PluginInput[];
  detectConflicts?: boolean;  // 默认 true
}
```

---

## 六、多租户隔离机制

### 6.1 隔离策略

| 操作 | 隔离机制 |
|------|----------|
| `findOne` | 强制添加 `{ id, tenantId }` 条件 |
| `findOneBy` | 移除客户端传入的 tenantId，注入上下文中的值 |
| `findAll` | 移除客户端传入的 tenantId，注入上下文中的值 |
| `create` | 移除客户端传入的 tenantId，注入上下文中的值 |
| `update` | 禁止修改 tenantId，移除客户端传入的值 |
| `delete` | 强制添加 `{ id, tenantId }` 条件 |
| `count` | 移除客户端传入的 tenantId，注入上下文中的值 |

### 6.2 安全保证

1. **查询隔离**：所有查询自动添加 tenantId 过滤
2. **创建隔离**：创建时强制使用上下文中的 tenantId
3. **更新隔离**：禁止修改实体的 tenantId
4. **删除隔离**：删除前验证实体属于当前租户

---

## 七、测试覆盖

| 文件 | 覆盖率 | 说明 |
|------|--------|------|
| `mikro-orm-options.adapter.ts` | 100% | 完整覆盖 |
| `tenant-aware.service.ts` | 100% | 完整覆盖 |
| `tenant-aware.repository.ts` | 86.88% | 核心逻辑覆盖 |
| `mikro-orm.module.ts` | 0% | 需集成测试 |
| `mikro-orm.config.ts` | 0% | 需集成测试 |
| **总体** | **83.9%** | ✅ 达标 |

---

## 八、依赖关系

### 8.1 生产依赖

```json
{
  "@mikro-orm/core": "catalog:",
  "@mikro-orm/migrations": "catalog:",
  "@mikro-orm/nestjs": "catalog:",
  "@mikro-orm/postgresql": "catalog:",
  "@nestjs/common": "catalog:",
  "@nestjs/config": "catalog:",
  "@oksai/config": "workspace:*",
  "@oksai/plugin": "workspace:*",
  "pg": "catalog:"
}
```

### 8.2 Peer 依赖

```json
{
  "@mikro-orm/core": "^6.0.0",
  "@mikro-orm/nestjs": "^6.0.0",
  "@mikro-orm/postgresql": "^6.0.0",
  "@nestjs/common": "^11.0.0",
  "@nestjs/config": "^4.0.0"
}
```

---

## 九、错误处理

| 场景 | 错误消息 |
|------|----------|
| 缺少 tenantId | `缺少 tenantId` |
| 实体冲突 | `插件元数据冲突（请重命名或调整装配列表）：` |
| 订阅者冲突 | `订阅者冲突：{className}（{firstSource} vs {secondSource}）` |

---

## 十、迁移指南（v1 → v2）

### 10.1 已移除的 API

| v1 API | 状态 | 替代方案 |
|--------|------|----------|
| `DatabaseConfig` | ❌ 移除 | 使用 `MikroOrmConfig` |
| `ConnectionPool` | ❌ 移除 | 使用 MikroORM 连接池 |
| `TransactionManager` | ❌ 移除 | 使用 MikroORM 事务 |
| `RepositoryBase` | ❌ 移除 | 使用 `TenantAwareService` 或 `createTenantAwareRepository` |

### 10.2 新增的 API

| v2 API | 说明 |
|--------|------|
| `createMikroOrmConfig` | 创建 MikroORM 配置 |
| `setupMikroOrmModule` | 装配 MikroORM 模块 |
| `createTenantAwareRepository` | 创建租户感知仓储 |
| `TenantAwareService` | 租户感知服务基类 |
| `composeMikroOrmOptionsFromPlugins` | 插件元数据聚合 |
