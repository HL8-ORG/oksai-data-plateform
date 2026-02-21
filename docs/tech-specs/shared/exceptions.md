# Exceptions 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/exceptions` 提供统一的异常体系，支持：

- **分层异常**：按架构层次分类的异常类型
- **结构化错误**：包含错误码和上下文信息
- **验证错误**：支持多字段验证失败
- **业务规则**：专门用于业务规则违反

### 1.2 异常层次结构

```
┌─────────────────────────────────────────────────────────────┐
│                    BaseException                             │
│  (code, context, cause)                                      │
└─────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌───────────────────┐
│DomainException│ │Application   │ │Infrastructure     │
│               │ │Exception     │ │Exception          │
└──────────────┘ └──────────────┘ └───────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Error (原生)                            │
└─────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌───────────────────┐
│Validation    │ │BusinessRule  │ │NotFound           │
│Exception     │ │Exception     │ │Exception          │
└──────────────┘ └──────────────┘ └───────────────────┘
```

---

## 二、异常类型

### 2.1 DomainException（领域异常）

表示领域层的业务规则违反：

```typescript
import { DomainException } from '@oksai/exceptions';

// 基本用法
throw new DomainException('任务不存在', 'JOB_NOT_FOUND');

// 带原因
throw new DomainException('任务状态无效', 'INVALID_STATUS', {
  cause: originalError,
  context: { currentStatus: 'completed', expectedStatus: 'pending' }
});

// 常见错误码
throw new DomainException('聚合已删除', 'AGGREGATE_DELETED');
throw new DomainException('版本冲突', 'VERSION_CONFLICT');
throw new DomainException('不变量违反', 'INVARIANT_VIOLATION');
```

**适用场景**：
- 聚合状态不允许的操作
- 领域规则违反
- 实体不存在

### 2.2 ApplicationException（应用异常）

表示应用层的用例执行错误：

```typescript
import { ApplicationException } from '@oksai/exceptions';

throw new ApplicationException('用例执行失败', 'USE_CASE_FAILED');
throw new ApplicationException('并发冲突，请重试', 'CONCURRENCY_CONFLICT');
throw new ApplicationException('操作超时', 'OPERATION_TIMEOUT', {
  context: { operation: 'import', timeout: 30000 }
});
```

**适用场景**：
- 用例协调失败
- 并发控制冲突
- 工作流错误

### 2.3 InfrastructureException（基础设施异常）

表示基础设施层的技术错误：

```typescript
import { InfrastructureException } from '@oksai/exceptions';

throw new InfrastructureException('数据库连接失败', 'DB_CONNECTION_FAILED', {
  cause: pgError
});

throw new InfrastructureException('Redis 不可用', 'REDIS_UNAVAILABLE');
throw new InfrastructureException('消息队列连接失败', 'MQ_CONNECTION_FAILED');
throw new InfrastructureException('外部 API 调用失败', 'EXTERNAL_API_ERROR');
```

**适用场景**：
- 数据库连接/查询错误
- 缓存服务不可用
- 消息队列故障
- 外部服务调用失败

### 2.4 ValidationException（验证异常）

表示输入验证失败：

```typescript
import { ValidationException, ValidationError } from '@oksai/exceptions';

// 单字段错误
throw new ValidationException('用户名不能为空', 'username');
throw new ValidationException('邮箱格式不正确', 'email');

// 多字段错误
const errors: ValidationError[] = [
  { field: 'name', message: '名称不能为空' },
  { field: 'email', message: '邮箱格式不正确' },
  { field: 'age', message: '年龄必须大于 0' },
];
throw new ValidationException('验证失败', undefined, { errors });
```

**错误结构**：
```typescript
interface ValidationError {
  field: string;    // 字段名称
  message: string;  // 错误消息
}
```

### 2.5 BusinessRuleException（业务规则异常）

表示业务规则被违反：

```typescript
import { BusinessRuleException } from '@oksai/exceptions';

throw new BusinessRuleException('任务必须包含至少一个任务项');
throw new BusinessRuleException('超出预算限制', 'BUDGET_LIMIT_EXCEEDED');
throw new BusinessRuleException('超出每日限制', 'DAILY_LIMIT_EXCEEDED');
```

**与 DomainException 的区别**：
- `DomainException`：核心领域不变量
- `BusinessRuleException`：可配置的业务策略

### 2.6 NotFoundException（未找到异常）

表示请求的资源不存在：

```typescript
import { NotFoundException } from '@oksai/exceptions';

throw new NotFoundException('任务', 'job-123');
// 错误消息: "未找到任务: job-123"

throw new NotFoundException('用户', 'user-456');
// 错误消息: "未找到用户: user-456"
```

---

## 三、API 参考

### 3.1 BaseException

```typescript
abstract class BaseException extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  );
}
```

### 3.2 DomainException

```typescript
class DomainException extends BaseException {
  constructor(
    message: string,
    code: string,
    options?: { cause?: Error; context?: Record<string, unknown> }
  );
}
```

### 3.3 ApplicationException

```typescript
class ApplicationException extends BaseException {
  constructor(
    message: string,
    code: string,
    options?: { cause?: Error; context?: Record<string, unknown> }
  );
}
```

### 3.4 InfrastructureException

```typescript
class InfrastructureException extends BaseException {
  constructor(
    message: string,
    code: string,
    options?: { cause?: Error; context?: Record<string, unknown> }
  );
}
```

### 3.5 ValidationException

```typescript
interface ValidationError {
  field: string;
  message: string;
}

class ValidationException extends Error {
  readonly field?: string;
  readonly errors?: ValidationError[];

  constructor(
    message: string,
    field?: string,
    options?: { errors?: ValidationError[] }
  );
}
```

### 3.6 BusinessRuleException

```typescript
class BusinessRuleException extends Error {
  readonly rule?: string;

  constructor(message: string, rule?: string);
}
```

### 3.7 NotFoundException

```typescript
class NotFoundException extends Error {
  readonly entityType: string;
  readonly identifier: string;

  constructor(entityType: string, identifier: string);
}
```

---

## 四、错误码约定

### 4.1 命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 领域错误 | `ENTITY_ACTION` | `JOB_NOT_FOUND`, `JOB_ALREADY_COMPLETED` |
| 应用错误 | `OPERATION_STATUS` | `USE_CASE_FAILED`, `CONCURRENCY_CONFLICT` |
| 基础设施错误 | `SERVICE_ERROR` | `DB_CONNECTION_FAILED`, `REDIS_UNAVAILABLE` |
| 业务规则 | `RULE_NAME` | `BUDGET_LIMIT_EXCEEDED`, `DAILY_LIMIT_EXCEEDED` |

### 4.2 常用错误码

**领域层**：
| 错误码 | 说明 |
|--------|------|
| `ENTITY_NOT_FOUND` | 实体不存在 |
| `INVALID_STATE` | 状态无效 |
| `INVARIANT_VIOLATION` | 不变量违反 |
| `VERSION_CONFLICT` | 版本冲突 |

**基础设施层**：
| 错误码 | 说明 |
|--------|------|
| `DB_CONNECTION_FAILED` | 数据库连接失败 |
| `DB_QUERY_ERROR` | 查询错误 |
| `REDIS_UNAVAILABLE` | Redis 不可用 |
| `MQ_CONNECTION_FAILED` | 消息队列连接失败 |
| `EXTERNAL_API_ERROR` | 外部 API 错误 |

---

## 五、使用指南

### 5.1 选择正确的异常类型

```
在哪里抛出异常？
      │
      ├─ 领域层（聚合/实体/值对象）
      │     └─→ DomainException
      │
      ├─ 应用层（用例/命令处理器）
      │     ├─ 协调失败 ─→ ApplicationException
      │     └─ 输入验证 ─→ ValidationException
      │
      ├─ 基础设施层（适配器/仓储实现）
      │     └─→ InfrastructureException
      │
      └─ 接口层（控制器）
            └─→ NotFoundException
```

### 5.2 全局异常过滤器（NestJS）

```typescript
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { 
  DomainException, 
  ApplicationException, 
  InfrastructureException,
  ValidationException,
  NotFoundException 
} from '@oksai/exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof ValidationException) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: exception.message,
        field: exception.field,
        errors: exception.errors,
      });
    }

    if (exception instanceof NotFoundException) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: exception.message,
        entityType: exception.entityType,
        identifier: exception.identifier,
      });
    }

    if (exception instanceof DomainException) {
      return response.status(400).json({
        error: exception.code,
        message: exception.message,
      });
    }

    if (exception instanceof ApplicationException) {
      return response.status(500).json({
        error: exception.code,
        message: exception.message,
      });
    }

    if (exception instanceof InfrastructureException) {
      return response.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: '服务暂时不可用',
      });
    }

    // 未知异常
    return response.status(500).json({
      error: 'INTERNAL_ERROR',
      message: '内部服务器错误',
    });
  }
}
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

---

## 七、最佳实践

### 7.1 提供有意义的错误消息

```typescript
// ❌ 不好
throw new DomainException('错误', 'ERROR');

// ✅ 好
throw new DomainException(
  '任务已完成，无法再次启动',
  'JOB_ALREADY_COMPLETED',
  { context: { jobId: job.id.toValue(), status: job.status } }
);
```

### 7.2 包含原始错误

```typescript
try {
  await this.repository.save(aggregate);
} catch (error) {
  throw new InfrastructureException(
    '保存聚合失败',
    'PERSISTENCE_ERROR',
    { cause: error, context: { aggregateId: aggregate.id.toValue() } }
  );
}
```

### 7.3 验证失败使用 ValidationException

```typescript
// 单字段验证
if (!email.includes('@')) {
  throw new ValidationException('邮箱格式不正确', 'email');
}

// 多字段验证
const errors: ValidationError[] = [];
if (!name) errors.push({ field: 'name', message: '名称不能为空' });
if (!email) errors.push({ field: 'email', message: '邮箱不能为空' });
if (errors.length > 0) {
  throw new ValidationException('验证失败', undefined, { errors });
}
```
