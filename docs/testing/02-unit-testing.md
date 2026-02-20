# 单元测试

[返回目录](./README.md) | [上一章：测试概述](./01-testing-overview.md)

---

## 一、单元测试定义

单元测试是一种**验证技术**，用于验证**最小的可测试单元**（函数、方法、类）是否按预期工作。

### 1.1 单元测试的特点

| 特点 | 说明 |
|:---|:---|
| **隔离性** | 不依赖外部资源（数据库、网络、文件系统） |
| **速度快** | 毫秒级执行 |
| **原子性** | 一个测试只验证一件事 |
| **可重复** | 每次运行结果一致 |
| **独立性** | 测试之间互不影响 |

---

## 二、AAA 模式

单元测试遵循 **Arrange-Act-Assert** 模式：

```typescript
describe('PricingCalculator', () => {
  it('should calculate total with tax', () => {
    // ==================== Arrange - 准备 ====================
    const calculator = new PricingCalculator();
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ];
    const taxRate = 0.1;

    // ==================== Act - 执行 ====================
    const total = calculator.calculateWithTax(items, taxRate);

    // ==================== Assert - 断言 ====================
    expect(total).toBe(275); // (200 + 50) * 1.1 = 275
  });
});
```

---

## 三、领域层单元测试

### 3.1 测试聚合根

```typescript
// 文件: job.aggregate.spec.ts
import { Job } from './job.aggregate';
import { Money } from './money.vo';
import { JobItem } from './job-item.entity';

describe('Job', () => {
  let job: Job;
  let jobId: JobId;
  let tenantId: string;

  beforeEach(() => {
    jobId = JobId.generate();
    tenantId = 'tenant-123';
    job = Job.create({ id: jobId, customerId: 'customer-456', tenantId });
  });

  describe('addItem', () => {
    it('should add item to draft job', () => {
      // Arrange
      const task = new Task('task-1', '开发功能', Money.of(1000));

      // Act
      job.addItem(task, 2);

      // Assert
      expect(job.items).toHaveLength(1);
      expect(job.total).toEqual(Money.of(2000));
    });

    it('should throw error when adding item to submitted job', () => {
      // Arrange
      job.addItem(new Task('task-1', '开发功能', Money.of(100)), 1);
      job.submit();

      // Act & Assert
      expect(() => {
        job.addItem(new Task('task-2', '测试功能', Money.of(50)), 1);
      }).toThrow('不能修改已提交的任务');
    });

    it('should accumulate total for multiple items', () => {
      // Arrange
      const task1 = new Task('task-1', '开发功能', Money.of(1000));
      const task2 = new Task('task-2', '测试功能', Money.of(50));

      // Act
      job.addItem(task1, 1);
      job.addItem(task2, 2);

      // Assert
      expect(job.total).toEqual(Money.of(1100));
    });
  });

  describe('submit', () => {
    it('should change status to submitted when job has items', () => {
      // Arrange
      job.addItem(new Task('task-1', '开发功能', Money.of(100)), 1);

      // Act
      job.submit();

      // Assert
      expect(job.status).toBe('submitted');
      expect(job.submittedAt).toBeDefined();
    });

    it('should throw error when submitting empty job', () => {
      // Act & Assert
      expect(() => job.submit()).toThrow('不能提交空任务');
    });

    it('should emit JobSubmittedEvent', () => {
      // Arrange
      job.addItem(new Task('task-1', '开发功能', Money.of(100)), 1);

      // Act
      job.submit();

      // Assert
      const events = job.domainEvents;
      expect(events).toContainEqual(
        expect.objectContaining({
          eventType: 'JobSubmitted'
        })
      );
    });
  });
});
```

### 3.2 测试值对象

```typescript
// 文件: money.vo.spec.ts
import { Money } from './money.vo';
import { ValidationError } from '@shared/errors';

describe('Money', () => {
  describe('create', () => {
    it('should create money with valid amount and currency', () => {
      // Arrange & Act
      const result = Money.create(100, 'CNY');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value.amount).toBe(100);
      expect(result.value.currency).toBe('CNY');
    });

    it('should fail when amount is negative', () => {
      // Arrange & Act
      const result = Money.create(-100, 'CNY');

      // Assert
      expect(result.isFail()).toBe(true);
      expect(result.value).toBeInstanceOf(ValidationError);
      expect(result.value.message).toContain('不能为负数');
    });

    it('should fail when currency is invalid', () => {
      // Arrange & Act
      const result = Money.create(100, 'INVALID');

      // Assert
      expect(result.isFail()).toBe(true);
    });
  });

  describe('add', () => {
    it('should add two money objects with same currency', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 50, currency: 'CNY' });

      // Act
      const result = money1.add(money2);

      // Assert
      expect(result.amount).toBe(150);
    });

    it('should throw when adding different currencies', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 50, currency: 'USD' });

      // Act & Assert
      expect(() => money1.add(money2)).toThrow('不能对不同货币进行运算');
    });
  });
});
```

---

## 四、应用层单元测试

### 4.1 测试命令处理器

```typescript
// 文件: create-job.handler.spec.ts
import { CreateJobHandler } from './create-job.handler';
import { CreateJobCommand } from '../create-job.command';
import { MockJobRepository } from '../../__tests__/mocks/job-repository.mock';
import { MockEventBus } from '../../__tests__/mocks/event-bus.mock';

describe('CreateJobHandler', () => {
  let handler: CreateJobHandler;
  let mockJobRepo: MockJobRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockJobRepo = new MockJobRepository();
    mockEventBus = new MockEventBus();
    handler = new CreateJobHandler(mockJobRepo, mockEventBus);
  });

  describe('execute', () => {
    it('should create job successfully', async () => {
      // Arrange
      const command = new CreateJobCommand({
        customerId: 'customer-123',
        tenantId: 'tenant-456'
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockJobRepo.saveCalls).toHaveLength(1);
      expect(mockEventBus.publishedEvents).toHaveLength(1);
    });

    it('should fail when customer does not exist', async () => {
      // Arrange
      const command = new CreateJobCommand({
        customerId: 'non-existent-customer',
        tenantId: 'tenant-456'
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFail()).toBe(true);
      expect(result.value.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });
});
```

---

## 五、单元测试最佳实践

### 5.1 测试命名规范

```typescript
// ✅ 好的命名
describe('Job', () => {
  describe('submit', () => {
    it('should change status to submitted when job has items', () => {});
    it('should throw error when submitting empty job', () => {});
    it('should emit JobSubmittedEvent on successful submission', () => {});
  });
});

// ❌ 不好的命名
describe('Job', () => {
  it('test1', () => {});
  it('should work', () => {});
  it('submit', () => {});
});
```

### 5.2 一个测试只验证一件事

```typescript
// ✅ 正确：每个测试只验证一个行为
it('should calculate correct total', () => {
  job.addItem(task, 2);
  expect(job.total).toBe(200);
});

it('should emit event when item added', () => {
  job.addItem(task, 2);
  expect(job.domainEvents).toHaveLength(1);
});

// ❌ 错误：一个测试验证多件事
it('should add item correctly', () => {
  job.addItem(task, 2);
  expect(job.items).toHaveLength(1);
  expect(job.total).toBe(200);
  expect(job.domainEvents).toHaveLength(1);
});
```

### 5.3 测试边界条件

```typescript
describe('Job addItem', () => {
  it('should add item with quantity 1', () => {});
  it('should add item with maximum quantity (100)', () => {});
  it('should throw error when quantity is 0', () => {});
  it('should throw error when quantity is negative', () => {});
  it('should throw error when quantity exceeds 100', () => {});
});
```

### 5.4 使用测试夹具（Fixture）

```typescript
// 文件: job.fixture.ts
export class JobFixture {
  static createDefault(overrides?: Partial<JobProps>): Job {
    return Job.create({
      id: JobId.generate(),
      customerId: 'customer-123',
      tenantId: 'tenant-456',
      ...overrides
    });
  }

  static createWithItems(itemCount: number): Job {
    const job = this.createDefault();
    for (let i = 0; i < itemCount; i++) {
      job.addItem(
        new Task(`task-${i}`, `任务 ${i}`, Money.of(100)),
        1
      );
    }
    return job;
  }

  static createSubmittedJob(): Job {
    const job = this.createWithItems(2);
    job.submit();
    return job;
  }
}

// 使用
it('should calculate total correctly', () => {
  const job = JobFixture.createWithItems(3);
  expect(job.total).toEqual(Money.of(300));
});
```

---

## 六、常见错误与解决方案

### 6.1 测试依赖外部资源

```typescript
// ❌ 错误：依赖真实数据库
it('should save job', async () => {
  const repo = new PostgresJobRepository(realDb);
  await repo.save(job);
  // 测试不稳定，依赖外部状态
});

// ✅ 正确：使用 Mock
it('should save job', async () => {
  const mockRepo = new MockJobRepository();
  await mockRepo.save(job);
  expect(mockRepo.saveCalls).toContain(job);
});
```

### 6.2 测试之间相互影响

```typescript
// ❌ 错误：共享状态
let job: Job;
it('should add item', () => {
  job.addItem(task, 1); // 修改了共享状态
});
it('should submit', () => {
  // 此时 job 已有任务，可能不是预期行为
});

// ✅ 正确：每个测试独立初始化
beforeEach(() => {
  job = Job.create(...);
});
```

---

## 七、文件命名规范

| 测试类型 | 文件后缀 | 被测文件 | 测试文件 |
|:---|:---|:---|:---|
| **聚合根** | `.spec.ts` | `job.aggregate.ts` | `job.aggregate.spec.ts` |
| **值对象** | `.spec.ts` | `money.vo.ts` | `money.vo.spec.ts` |
| **实体** | `.spec.ts` | `job-item.entity.ts` | `job-item.entity.spec.ts` |
| **命令处理器** | `.spec.ts` | `create-job.handler.ts` | `create-job.handler.spec.ts` |
| **仓储** | `.int-spec.ts` | `postgres-job.repository.ts` | `postgres-job.repository.int-spec.ts` |

---

[下一章：BDD测试 →](./03-bdd-testing.md)
