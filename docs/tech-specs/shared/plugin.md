# Plugin 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/plugin` 提供插件系统基础设施：

- **插件定义**：基于 NestJS Module 的插件
- **元数据系统**：通过 Reflect 挂载扩展信息
- **生命周期**：插件启动和销毁钩子
- **平台集成**：统一的插件加载和装配

### 1.2 插件 = Nest Module

插件以 Nest Module 或 DynamicModule 形式参与组装，通过元数据扩展能力。

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/plugin/
├── lib/
│   ├── plugin.interface.ts       # 插件接口定义
│   ├── plugin-metadata.ts        # 元数据装饰器
│   ├── plugin.ts                 # 插件基类
│   ├── plugin.module.ts          # 插件模块
│   └── plugin.helper.ts          # 辅助函数
└── index.ts
```

### 2.2 插件元数据扩展

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Module                             │
│  （普通的 Nest Module）                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Reflect Metadata
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PluginMetadata                             │
│  - entities: 实体列表                                        │
│  - subscribers: 订阅者列表                                   │
│  - integrationEventSubscribers: 集成事件订阅者               │
│  - extensions: 扩展点配置                                    │
│  - configuration: 配置回调                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 定义插件

```typescript
import { Module } from '@nestjs/common';
import { Plugin, PluginMetadata } from '@oksai/plugin';
import { JobEntity } from './entities/job.entity';
import { JobEventSubscriber } from './subscribers/job-event.subscriber';

// 定义插件元数据
const jobPluginMetadata: PluginMetadata = {
  entities: [JobEntity],
  subscribers: [JobEventSubscriber],
  integrationEventSubscribers: [JobIntegrationSubscriber],
};

@Module({
  controllers: [JobController],
  providers: [JobService],
})
@Plugin(jobPluginMetadata)
export class JobPlugin implements IOnPluginBootstrap {
  onPluginBootstrap() {
    console.log('Job 插件已启动');
  }
}
```

### 3.2 插件生命周期

```typescript
import { IOnPluginBootstrap, IOnPluginDestroy } from '@oksai/plugin';

@Module({})
export class MyPlugin implements IOnPluginBootstrap, IOnPluginDestroy {
  onPluginBootstrap() {
    // 插件启动时执行
    console.log('插件启动');
  }

  onPluginDestroy() {
    // 插件销毁时执行
    console.log('插件销毁');
  }
}
```

### 3.3 延迟加载实体

```typescript
const metadata: PluginMetadata = {
  // 延迟加载实体（减少启动时间）
  entities: () => import('./entities').then(m => [
    m.JobEntity,
    m.JobItemEntity,
  ]),

  // 延迟加载订阅者
  subscribers: () => import('./subscribers').then(m => [
    m.JobEventSubscriber,
  ]),
};
```

### 3.4 集成事件订阅者

```typescript
import { IIntegrationEventSubscriber } from '@oksai/plugin';

export class JobIntegrationSubscriber implements IIntegrationEventSubscriber {
  async handle(event: IntegrationEvent): Promise<void> {
    // 强约束：tenantId 必填
    const tenantId = event.metadata.tenantId;

    // 幂等处理：使用 eventId 作为幂等键
    const processed = await this.checkProcessed(event.eventId);
    if (processed) return;

    // 处理事件
    await this.processEvent(event);

    // 标记已处理
    await this.markProcessed(event.eventId);
  }
}
```

---

## 四、API 参考

### 4.1 PluginMetadata

```typescript
interface PluginMetadata extends ModuleMetadata {
  /**
   * 插件提供的实体列表（用于 ORM 注册/迁移）
   */
  entities?: LazyValue<Array<Type<unknown>>>;

  /**
   * 插件提供的订阅者列表（例如 ORM subscribers）
   */
  subscribers?: LazyValue<Array<Type<unknown>>>;

  /**
   * 插件提供的集成事件订阅者列表
   *
   * 强约束：
   * - tenantId 必填且不可被覆盖
   * - 幂等处理（建议以 eventId 作为幂等键）
   * - 超时与重试策略可配置
   */
  integrationEventSubscribers?: LazyValue<Array<Type<unknown>>>;

  /**
   * 插件扩展点配置
   */
  extensions?: LazyValue<unknown>;

  /**
   * 插件配置回调
   */
  configuration?: LazyValue<unknown>;
}

type LazyValue<T> = T | (() => T);
```

### 4.2 生命周期接口

```typescript
interface IOnPluginBootstrap {
  onPluginBootstrap(): void | Promise<void>;
}

interface IOnPluginDestroy {
  onPluginDestroy(): void | Promise<void>;
}

type PluginLifecycleMethods = IOnPluginBootstrap & IOnPluginDestroy;
```

### 4.3 PluginInput

```typescript
type PluginInput = Type<unknown> | DynamicModule;
```

---

## 五、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 94.8% |
| Branches | 80% |
| Functions | 100% |
| Lines | 94.28% |

---

## 六、最佳实践

### 6.1 插件命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 插件类 | `{Domain}Plugin` | `JobPlugin`, `TenantPlugin` |
| 插件目录 | `libs/plugins/{domain}` | `libs/plugins/job` |

### 6.2 插件边界

- 插件应独立完整，包含自己的领域、应用、基础设施层
- 插件间通过事件总线通信，避免直接依赖
- 插件可以依赖共享模块（@oksai/kernel, @oksai/cqrs 等）

### 6.3 实体注册

```typescript
// ✅ 好：通过元数据注册
@Plugin({
  entities: [JobEntity],
})

// ❌ 不好：在模块中直接注册
@Module({
  providers: [JobEntity],  // ORM 实体不应作为 provider
})
```
