# DDD 架构中的测试

[返回目录](./README.md) | [上一章:TDD方法论](./04-tdd-methodology.md)

---

## 一、DDD 分层测试策略

### 1.1 测试金字塔在 DDD 中的应用

```
┌──────────────────────────────────────────────┐
│              E2E 测试 (10%)                   │  完整业务流程
│         API 层 → 应用层 → 领域层              │
├──────────────────────────────────────────────┤
│            集成测试 (20%)                     │  仓储、适配器
│    Repository 实现、Infrastructure 层         │
├──────────────────────────────────────────────┤
│            单元测试 (70%)                     │  领域逻辑
│   聚合根、实体、值对象、领域服务、应用服务      │
└──────────────────────────────────────────────┘
```

### 1.2 各层测试关注点

| 层次 | 测试重点 | 测试类型 | 速度 |
|:---|:---|:---|:---|
| **领域层** | 业务规则、不变性约束 | 单元测试 | 毫秒级 |
| **应用层** | 用例编排、命令处理 | 单元测试 | 毫秒级 |
| **基础设施层** | 持久化、外部集成 | 集成测试 | 秒级 |
| **接口层** | API 契约、数据验证 | 集成/E2E | 秒级 |

---

## 二、领域层测试

### 2.1 测试聚合根

**测试重点**:
- 业务规则验证
- 状态转换正确性
- 领域事件触发
- 不变性约束

```typescript
// 文件: job.aggregate.spec.ts
import { Job } from './job.aggregate';
import { JobItem } from './job-item.entity';
import { Money } from './money.vo';
import { Task } from './task.entity';

describe('Job', () => {
  let job: Job;
  let task: Task;

  beforeEach(() => {
    task = new Task('task-1', '开发功能', Money.of(1000));
    job = Job.create({
      customerId: 'customer-123',
      tenantId: 'tenant-456'
    });
  });

  describe('创建任务', () => {
    it('应该成功创建草稿任务', () => {
      // Arrange
      const props = {
        customerId: 'customer-123',
        tenantId: 'tenant-456'
      };

      // Act
      const result = Job.create(props);

      // Assert
      expect(result.isOk()).toBe(true);
      const job = result.value;
      expect(job.status).toBe('draft');
      expect(job.items).toHaveLength(0);
    });

    it('创建任务时应该触发 JobCreatedEvent', () => {
      // Arrange
      const props = {
        customerId: 'customer-123',
        tenantId: 'tenant-456'
      };

      // Act
      const job = Job.create(props).value;

      // Assert
      const events = job.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('JobCreated');
      expect(events[0].aggregateId).toBe(job.id);
    });
  });

  describe('添加工作项', () => {
    it('应该成功添加工作项到草稿任务', () => {
      // Arrange - 任务已创建

      // Act
      job.addItem(task, 2);

      // Assert
      expect(job.items).toHaveLength(1);
      expect(job.total).toEqual(Money.of(2000));
    });

    it('添加工作项时应该触发 ItemAddedEvent', () => {
      // Arrange
      job.clearEvents(); // 清除创建时的事件

      // Act
      job.addItem(task, 1);

      // Assert
      const events = job.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('ItemAdded');
    });

    it('相同工作项应该合并数量', () => {
      // Arrange
      job.addItem(task, 2);

      // Act
      job.addItem(task, 3);

      // Assert
      expect(job.items).toHaveLength(1);
      expect(job.items[0].quantity).toBe(5);
      expect(job.total).toEqual(Money.of(5000));
    });

    it('不能向已提交的任务添加工作项', () => {
      // Arrange
      job.addItem(task, 1);
      job.submit();

      // Act & Assert
      expect(() => {
        job.addItem(new Task('task-2', '测试功能', Money.of(100)), 1);
      }).toThrow('不能修改已提交的任务');
    });

    it('数量必须大于0', () => {
      // Act & Assert
      expect(() => {
        job.addItem(task, 0);
      }).toThrow('数量必须大于0');

      expect(() => {
        job.addItem(task, -1);
      }).toThrow('数量必须大于0');
    });
  });

  describe('提交任务', () => {
    it('应该成功提交包含工作项的任务', () => {
      // Arrange
      job.addItem(task, 1);

      // Act
      job.submit();

      // Assert
      expect(job.status).toBe('submitted');
      expect(job.submittedAt).toBeDefined();
    });

    it('不能提交空任务', () => {
      // Act & Assert
      expect(() => job.submit()).toThrow('不能提交空任务');
    });

    it('提交任务时应该触发 JobSubmittedEvent', () => {
      // Arrange
      job.addItem(task, 1);
      job.clearEvents();

      // Act
      job.submit();

      // Assert
      const events = job.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('JobSubmitted');
    });

    it('不能重复提交任务', () => {
      // Arrange
      job.addItem(task, 1);
      job.submit();

      // Act & Assert
      expect(() => job.submit()).toThrow('任务已提交');
    });
  });

  describe('取消任务', () => {
    it('应该成功取消草稿任务', () => {
      // Arrange
      job.addItem(task, 1);

      // Act
      job.cancel('用户取消');

      // Assert
      expect(job.status).toBe('cancelled');
    });

    it('不能取消已提交的任务', () => {
      // Arrange
      job.addItem(task, 1);
      job.submit();

      // Act & Assert
      expect(() => job.cancel('取消')).toThrow('不能取消已提交的任务');
    });
  });

  describe('计算总价', () => {
    it('应该正确计算单个工作项的总价', () => {
      // Arrange
      job.addItem(task, 2);

      // Act
      const total = job.total;

      // Assert
      expect(total).toEqual(Money.of(2000));
    });

    it('应该正确计算多个工作项的总价', () => {
      // Arrange
      const task1 = new Task('t1', '开发功能', Money.of(1000));
      const task2 = new Task('t2', '测试功能', Money.of(100));

      // Act
      job.addItem(task1, 1);
      job.addItem(task2, 2);

      // Assert
      expect(job.total).toEqual(Money.of(1200));
    });

    it('空任务总价应为0', () => {
      // Assert
      expect(job.total).toEqual(Money.of(0));
    });
  });
});
```

### 2.2 测试值对象

**测试重点**:
- 创建验证规则
- 不变性约束
- 业务行为
- 相等性比较

```typescript
// 文件: money.vo.spec.ts
import { Money } from './money.vo';
import { ValidationError } from '@shared/errors';

describe('Money', () => {
  describe('创建', () => {
    it('应该成功创建有效的金额', () => {
      // Arrange & Act
      const result = Money.create(100, 'CNY');

      // Assert
      expect(result.isOk()).toBe(true);
      const money = result.value;
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('CNY');
    });

    it('金额不能为负数', () => {
      // Arrange & Act
      const result = Money.create(-100, 'CNY');

      // Assert
      expect(result.isFail()).toBe(true);
      expect(result.value).toBeInstanceOf(ValidationError);
      expect(result.value.message).toContain('金额不能为负数');
    });

    it('货币代码必须为3个字符', () => {
      // Arrange & Act
      const result1 = Money.create(100, 'CN');
      const result2 = Money.create(100, 'CHINESE');

      // Assert
      expect(result1.isFail()).toBe(true);
      expect(result1.value.message).toContain('货币代码必须为3个字符');

      expect(result2.isFail()).toBe(true);
    });

    it('货币代码应该转换为大写', () => {
      // Arrange & Act
      const result = Money.create(100, 'cny');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value.currency).toBe('CNY');
    });

    it('应该保留两位小数', () => {
      // Arrange & Act
      const result = Money.create(100.123, 'CNY');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value.amount).toBe(100.12);
    });
  });

  describe('运算', () => {
    it('应该正确相加相同货币', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 50, currency: 'CNY' });

      // Act
      const result = money1.add(money2);

      // Assert
      expect(result.amount).toBe(150);
    });

    it('不能相加不同货币', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 50, currency: 'USD' });

      // Act & Assert
      expect(() => money1.add(money2)).toThrow('不能对不同货币进行运算');
    });

    it('应该正确相减相同货币', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 30, currency: 'CNY' });

      // Act
      const result = money1.subtract(money2);

      // Assert
      expect(result.amount).toBe(70);
    });

    it('应该正确乘以系数', () => {
      // Arrange
      const money = Money.fromPersistence({ amount: 100, currency: 'CNY' });

      // Act
      const result = money.multiply(1.5);

      // Assert
      expect(result.amount).toBe(150);
    });
  });

  describe('相等性', () => {
    it('相同金额和货币应该相等', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 100, currency: 'CNY' });

      // Assert
      expect(money1.equals(money2)).toBe(true);
    });

    it('不同金额不应该相等', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 50, currency: 'CNY' });

      // Assert
      expect(money1.equals(money2)).toBe(false);
    });

    it('不同货币不应该相等', () => {
      // Arrange
      const money1 = Money.fromPersistence({ amount: 100, currency: 'CNY' });
      const money2 = Money.fromPersistence({ amount: 100, currency: 'USD' });

      // Assert
      expect(money1.equals(money2)).toBe(false);
    });
  });
});
```

### 2.3 测试领域服务

```typescript
// 文件: pricing.domain-service.spec.ts
import { PricingDomainService } from './pricing.domain-service';
import { Job } from './job.aggregate';
import { Customer } from './customer.aggregate';
import { Money } from './money.vo';

describe('PricingDomainService', () => {
  let service: PricingDomainService;
  let mockCustomerRepo: MockCustomerRepository;
  let mockDiscountPolicy: MockDiscountPolicy;

  beforeEach(() => {
    mockCustomerRepo = new MockCustomerRepository();
    mockDiscountPolicy = new MockDiscountPolicy();
    service = new PricingDomainService(mockCustomerRepo, mockDiscountPolicy);
  });

  describe('计算任务价格', () => {
    it('应该为普通会员计算原价', async () => {
      // Arrange
      const customer = Customer.create({ level: 'regular' });
      const job = JobFixture.createWithItems(2, Money.of(100));
      mockCustomerRepo.setupCustomer(customer);

      // Act
      const result = await service.calculateJobPrice(job, customer.id);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(Money.of(200));
    });

    it('应该为VIP会员应用折扣', async () => {
      // Arrange
      const customer = Customer.create({ level: 'vip' });
      const job = JobFixture.createWithItems(2, Money.of(100));
      mockCustomerRepo.setupCustomer(customer);
      mockDiscountPolicy.setupDiscount('vip', 0.1); // 10% 折扣

      // Act
      const result = await service.calculateJobPrice(job, customer.id);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(Money.of(180)); // 200 * 0.9
    });

    it('客户不存在时应该返回错误', async () => {
      // Arrange
      const job = JobFixture.createDefault();
      mockCustomerRepo.setupEmpty();

      // Act
      const result = await service.calculateJobPrice(job, 'non-existent');

      // Assert
      expect(result.isFail()).toBe(true);
      expect(result.value.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });
});
```

---

## 三、应用层测试

### 3.1 测试命令处理器

**测试重点**:
- 命令验证
- 聚合根生命周期管理
- 仓储调用
- 事件发布

```typescript
// 文件: create-job.handler.spec.ts
import { CreateJobHandler } from './create-job.handler';
import { CreateJobCommand } from '../create-job.command';
import { MockJobRepository } from '../../__tests__/mocks/job-repository.mock';
import { MockCustomerRepository } from '../../__tests__/mocks/customer-repository.mock';
import { MockEventBus } from '../../__tests__/mocks/event-bus.mock';

describe('CreateJobHandler', () => {
  let handler: CreateJobHandler;
  let mockJobRepo: MockJobRepository;
  let mockCustomerRepo: MockCustomerRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockJobRepo = new MockJobRepository();
    mockCustomerRepo = new MockCustomerRepository();
    mockEventBus = new MockEventBus();

    handler = new CreateJobHandler(
      mockJobRepo,
      mockCustomerRepo,
      mockEventBus
    );
  });

  describe('execute', () => {
    it('应该成功创建任务', async () => {
      // Arrange
      const customer = CustomerFixture.createDefault();
      mockCustomerRepo.setupCustomer(customer);

      const command = new CreateJobCommand({
        customerId: customer.id,
        tenantId: 'tenant-123'
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);

      const job = result.value;
      expect(job.customerId).toBe(customer.id);
      expect(job.status).toBe('draft');

      // 验证仓储调用
      expect(mockJobRepo.saveCalls).toHaveLength(1);
      expect(mockJobRepo.saveCalls[0]).toEqual(job);

      // 验证事件发布
      expect(mockEventBus.publishedEvents).toHaveLength(1);
      expect(mockEventBus.publishedEvents[0].eventName).toBe('JobCreated');
    });

    it('客户不存在时应该返回错误', async () => {
      // Arrange
      mockCustomerRepo.setupEmpty();

      const command = new CreateJobCommand({
        customerId: 'non-existent',
        tenantId: 'tenant-123'
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFail()).toBe(true);
      expect(result.value.code).toBe('CUSTOMER_NOT_FOUND');

      // 验证未调用仓储
      expect(mockJobRepo.saveCalls).toHaveLength(0);
      expect(mockEventBus.publishedEvents).toHaveLength(0);
    });

    it('应该使用命令中的租户ID', async () => {
      // Arrange
      const customer = CustomerFixture.createDefault();
      mockCustomerRepo.setupCustomer(customer);

      const command = new CreateJobCommand({
        customerId: customer.id,
        tenantId: 'tenant-456'
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value.tenantId).toBe('tenant-456');
    });
  });
});
```

### 3.2 测试查询处理器

```typescript
// 文件: get-job-by-id.handler.spec.ts
import { GetJobByIdHandler } from './get-job-by-id.handler';
import { GetJobByIdQuery } from '../get-job-by-id.query';
import { MockJobReadRepository } from '../../__tests__/mocks/job-read-repository.mock';

describe('GetJobByIdHandler', () => {
  let handler: GetJobByIdHandler;
  let mockJobReadRepo: MockJobReadRepository;

  beforeEach(() => {
    mockJobReadRepo = new MockJobReadRepository();
    handler = new GetJobByIdHandler(mockJobReadRepo);
  });

  describe('execute', () => {
    it('应该成功查询任务', async () => {
      // Arrange
      const jobReadModel = JobReadModelFixture.createDefault();
      mockJobReadRepo.setupJob(jobReadModel);

      const query = new GetJobByIdQuery({
        jobId: jobReadModel.id,
        tenantId: jobReadModel.tenantId
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(jobReadModel);
    });

    it('任务不存在时应该返回null', async () => {
      // Arrange
      mockJobReadRepo.setupEmpty();

      const query = new GetJobByIdQuery({
        jobId: 'non-existent',
        tenantId: 'tenant-123'
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBeNull();
    });

    it('不同租户不能查询其他租户的任务', async () => {
      // Arrange
      const jobReadModel = JobReadModelFixture.createDefault({
        tenantId: 'tenant-123'
      });
      mockJobReadRepo.setupJob(jobReadModel);

      const query = new GetJobByIdQuery({
        jobId: jobReadModel.id,
        tenantId: 'tenant-456' // 不同的租户
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBeNull(); // 不应该返回其他租户的数据
    });
  });
});
```

---

## 四、基础设施层测试

### 4.1 测试仓储实现

**测试重点**:
- CRUD 操作正确性
- 并发处理
- 事务管理
- 数据映射

```typescript
// 文件: postgres-job.repository.int-spec.ts
import { PostgresJobRepository } from './postgres-job.repository';
import { TestDatabase } from '../../../../tests/helpers/test-database';
import { Job } from '../../domain/job.aggregate';

describe('PostgresJobRepository', () => {
  let repository: PostgresJobRepository;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await TestDatabase.create();
    repository = new PostgresJobRepository(testDb.getConnection());
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.cleanup();
  });

  describe('save', () => {
    it('应该成功保存新任务', async () => {
      // Arrange
      const job = JobFixture.createDefault();

      // Act
      await repository.save(job);

      // Assert
      const found = await repository.findById(job.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(job.id);
      expect(found?.customerId).toBe(job.customerId);
    });

    it('应该更新已存在的任务', async () => {
      // Arrange
      const job = JobFixture.createDefault();
      await repository.save(job);

      // Act
      job.addItem(new Task('t1', '开发功能', Money.of(1000)), 1);
      await repository.save(job);

      // Assert
      const found = await repository.findById(job.id);
      expect(found?.items).toHaveLength(1);
    });

    it('应该处理并发更新', async () => {
      // Arrange
      const job = JobFixture.createDefault();
      await repository.save(job);

      // Act - 并发更新
      const [result1, result2] = await Promise.allSettled([
        repository.save(job),
        repository.save(job)
      ]);

      // Assert - 至少一个成功,一个失败(乐观锁)
      const successCount = [result1, result2].filter(
        r => r.status === 'fulfilled'
      ).length;
      expect(successCount).toBe(1);
    });
  });

  describe('findById', () => {
    it('应该返回null当任务不存在时', async () => {
      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('应该正确映射领域对象', async () => {
      // Arrange
      const job = JobFixture.createWithItems(2);
      await repository.save(job);

      // Act
      const found = await repository.findById(job.id);

      // Assert
      expect(found).toBeInstanceOf(Job);
      expect(found?.items).toHaveLength(2);
      expect(found?.total).toEqual(Money.of(200));
    });
  });

  describe('findByCustomerId', () => {
    it('应该返回客户的所有任务', async () => {
      // Arrange
      const customerId = 'customer-123';
      const job1 = JobFixture.createDefault({ customerId });
      const job2 = JobFixture.createDefault({ customerId });
      const otherJob = JobFixture.createDefault({ customerId: 'other' });

      await repository.save(job1);
      await repository.save(job2);
      await repository.save(otherJob);

      // Act
      const result = await repository.findByCustomerId(customerId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(j => j.id)).toContain(job1.id);
      expect(result.map(j => j.id)).toContain(job2.id);
    });
  });

  describe('delete', () => {
    it('应该成功删除任务', async () => {
      // Arrange
      const job = JobFixture.createDefault();
      await repository.save(job);

      // Act
      await repository.delete(job.id);

      // Assert
      const found = await repository.findById(job.id);
      expect(found).toBeNull();
    });
  });
});
```

---

## 五、测试最佳实践

### 5.1 使用测试夹具（Fixture）

```typescript
// 文件: job.fixture.ts
export class JobFixture {
  /**
   * 创建默认任务
   */
  static createDefault(overrides?: Partial<JobProps>): Job {
    return Job.create({
      customerId: 'customer-123',
      tenantId: 'tenant-456',
      ...overrides
    }).value;
  }

  /**
   * 创建包含工作项的任务
   */
  static createWithItems(itemCount: number, price?: Money): Job {
    const job = this.createDefault();
    for (let i = 0; i < itemCount; i++) {
      job.addItem(
        new Task(`task-${i}`, `任务 ${i}`, price || Money.of(100)),
        1
      );
    }
    return job;
  }

  /**
   * 创建已提交的任务
   */
  static createSubmittedJob(): Job {
    const job = this.createWithItems(2);
    job.submit();
    return job;
  }

  /**
   * 创建用于持久化的任务数据
   */
  static createPersistenceData(): JobPersistenceProps {
    return {
      id: 'job-123',
      customerId: 'customer-123',
      tenantId: 'tenant-456',
      status: 'draft',
      items: [],
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
```

### 5.2 使用 Mock 对象

```typescript
// 文件: job-repository.mock.ts
export class MockJobRepository implements IJobRepository {
  private jobs: Map<string, Job> = new Map();
  
  // 记录方法调用
  saveCalls: Job[] = [];
  findByIdCalls: string[] = [];

  async save(job: Job): Promise<void> {
    this.saveCalls.push(job);
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<Job | null> {
    this.findByIdCalls.push(id);
    return this.jobs.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.jobs.delete(id);
  }

  // 测试辅助方法
  setupJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  setupEmpty(): void {
    this.jobs.clear();
  }

  hasJob(id: string): boolean {
    return this.jobs.has(id);
  }

  clear(): void {
    this.jobs.clear();
    this.saveCalls = [];
    this.findByIdCalls = [];
  }
}
```

### 5.3 测试领域事件

```typescript
describe('Job Domain Events', () => {
  it('应该在创建任务时触发 JobCreatedEvent', () => {
    // Arrange & Act
    const job = Job.create({
      customerId: 'customer-123',
      tenantId: 'tenant-456'
    }).value;

    // Assert
    const events = job.domainEvents;
    expect(events).toHaveLength(1);
    
    const event = events[0] as JobCreatedEvent;
    expect(event.eventName).toBe('JobCreated');
    expect(event.aggregateId).toBe(job.id);
    expect(event.payload.customerId).toBe('customer-123');
    expect(event.metadata.tenantId).toBe('tenant-456');
  });

  it('应该在添加工作项时触发 ItemAddedEvent', () => {
    // Arrange
    const job = JobFixture.createDefault();
    job.clearEvents();
    const task = new Task('t1', '开发功能', Money.of(1000));

    // Act
    job.addItem(task, 2);

    // Assert
    const events = job.domainEvents;
    expect(events).toHaveLength(1);
    
    const event = events[0] as ItemAddedEvent;
    expect(event.eventName).toBe('ItemAdded');
    expect(event.payload.taskId).toBe('t1');
    expect(event.payload.quantity).toBe(2);
  });
});
```

---

## 六、测试覆盖率要求

### 6.1 各层覆盖率标准

| 层次 | 最低覆盖率 | 关键路径覆盖率 |
|:---|:---|:---|
| **领域层** | 80% | 90% |
| **应用层** | 80% | 90% |
| **基础设施层** | 70% | 80% |

### 6.2 Jest 配置

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/domain/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.int-spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/index.ts'
  ]
};
```

---

## 七、文件命名规范

| 测试类型 | 文件后缀 | 被测文件 | 测试文件 |
|:---|:---|:---|:---|
| **聚合根** | `.spec.ts` | `job.aggregate.ts` | `job.aggregate.spec.ts` |
| **值对象** | `.spec.ts` | `money.vo.ts` | `money.vo.spec.ts` |
| **实体** | `.spec.ts` | `job-item.entity.ts` | `job-item.entity.spec.ts` |
| **领域服务** | `.spec.ts` | `pricing.domain-service.ts` | `pricing.domain-service.spec.ts` |
| **命令处理器** | `.spec.ts` | `create-job.handler.ts` | `create-job.handler.spec.ts` |
| **仓储实现** | `.int-spec.ts` | `postgres-job.repository.ts` | `postgres-job.repository.int-spec.ts` |

---

[下一章:测试命名规范 →](./06-testing-naming.md)
