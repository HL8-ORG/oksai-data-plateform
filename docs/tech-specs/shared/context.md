# Context 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/context` 提供多租户上下文管理，包括：

- **租户上下文**：存储当前请求的租户信息
- **AsyncLocalStorage**：在异步调用链中传递上下文
- **上下文值对象**：类型安全的租户标识

### 1.2 设计目标

- 在请求处理链中透明传递租户信息
- 避免在每个函数中显式传递租户参数
- 线程安全的上下文存储

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/context/
├── lib/
│   ├── tenant-context.vo.ts              # 租户上下文值对象
│   ├── tenant-context.service.ts         # 租户上下文服务
│   └── async-local-storage.provider.ts   # ALS 提供者
├── spec/
│   └── ...
└── index.ts
```

### 2.2 上下文传递流程

```
HTTP 请求 (X-Tenant-ID header)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Middleware                         │
│  1. 从请求头提取租户 ID                                      │
│  2. 创建 TenantContext                                      │
│  3. 调用 TenantContextService.run(context, callback)        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   AsyncLocalStorage                          │
│              存储当前请求的租户上下文                        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    业务代码                                  │
│  const tenantId = tenantContextService.getTenantId();       │
│  // 在任何地方都能获取当前租户 ID                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 TenantContext 值对象

```typescript
import { TenantContext } from '@oksai/context';

// 创建租户上下文
const context = TenantContext.create({
  tenantId: 'tenant-123',
  userId: 'user-456',  // 可选
});

// 访问属性
console.log(context.tenantId); // 'tenant-123'
console.log(context.userId);   // 'user-456'
```

### 3.2 TenantContextService

```typescript
import { TenantContextService } from '@oksai/context';

// 在中间件中使用
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const context = TenantContext.create({ tenantId, userId });

    // 在上下文中执行后续处理
    this.tenantContext.run(context, () => {
      next();
    });
  }
}
```

### 3.3 在服务中获取上下文

```typescript
import { TenantContextService } from '@oksai/context';

@Injectable()
export class OrderService {
  constructor(
    private readonly tenantContext: TenantContextService
  ) {}

  async createOrder(data: CreateOrderDto) {
    // 获取当前租户 ID
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new Error('租户上下文未设置');
    }

    // 使用租户 ID 创建订单
    return this.orderRepository.save({
      ...data,
      tenantId,
    });
  }
}
```

### 3.4 获取完整上下文

```typescript
// 获取完整的租户上下文
const context = this.tenantContext.getContext();
if (context) {
  console.log(context.tenantId);
  console.log(context.userId);
}
```

---

## 四、API 参考

### 4.1 TenantContext

```typescript
interface TenantContextProps {
  tenantId: string;
  userId?: string;
}

class TenantContext extends ValueObject<TenantContextProps> {
  get tenantId(): string;
  get userId(): string | undefined;

  static create(props: TenantContextProps): TenantContext;
}
```

### 4.2 TenantContextService

```typescript
class TenantContextService {
  /**
   * 在租户上下文中执行回调
   */
  run<T>(context: TenantContext, callback: () => T): T;

  /**
   * 获取当前租户上下文
   */
  getContext(): TenantContext | undefined;

  /**
   * 获取当前租户 ID
   */
  getTenantId(): string | undefined;

  /**
   * 获取当前用户 ID
   */
  getUserId(): string | undefined;
}
```

### 4.3 AsyncLocalStorageProvider

```typescript
class AsyncLocalStorageProvider {
  /**
   * 获取 AsyncLocalStorage 实例
   */
  static getStore(): AsyncLocalStorage<TenantContext>;

  /**
   * 在存储中运行回调
   */
  static run<T>(context: TenantContext, callback: () => T): T;

  /**
   * 获取当前存储的上下文
   */
  static getStoreValue(): TenantContext | undefined;
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

## 六、注意事项

1. **中间件位置**：TenantMiddleware 应在认证中间件之后
2. **上下文隔离**：每个请求有独立的上下文，不会互相干扰
3. **异步安全**：基于 Node.js AsyncLocalStorage，支持 async/await
4. **默认值**：如果上下文未设置，`getTenantId()` 返回 `undefined`

---

## 七、与其他模块集成

### 7.1 与 @oksai/logger 集成

```typescript
setupLoggerModule({
  customProps: (req, res) => ({
    tenantId: tenantContextService.getTenantId(),
  }),
});
```

### 7.2 与 @oksai/database 集成（行级隔离）

```typescript
@Injectable()
export class TenantAwareRepository {
  async findAll() {
    const tenantId = this.tenantContext.getTenantId();
    return this.repository.find({ where: { tenantId } });
  }
}
```

### 7.3 与 @oksai/auth 集成

```typescript
// 在认证成功后设置完整的租户上下文
const context = TenantContext.create({
  tenantId: user.tenantId,
  userId: user.id,
});

this.tenantContext.run(context, () => {
  // 后续处理
});
```
