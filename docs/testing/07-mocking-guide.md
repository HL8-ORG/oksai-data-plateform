# Mock 与 Stub 指南

[返回目录](./README.md) | [上一章：测试命名规范](./06-testing-naming.md)

---

## 一、测试替身（Test Double）

### 1.1 测试替身分类

测试替身是在测试中替代真实对象的统称，主要分为以下几种：

| 类型 | 用途 | 特点 |
|:---|:---|:---|
| **Dummy** | 仅用于填充参数列表 | 不参与实际测试逻辑 |
| **Stub** | 提供预设的固定响应 | 用于隔离外部依赖 |
| **Spy** | 记录调用信息以便验证 | 用于验证方法调用 |
| **Mock** | 预设行为并验证交互 | 功能最全面 |
| **Fake** | 简化的工作实现 | 有真实业务逻辑 |

### 1.2 测试替身对比

```typescript
// ==================== Dummy ====================
// 仅用于填充参数，不参与实际逻辑
const dummyLogger = {} as ILogger; // 什么都不做

// ==================== Stub ====================
// 提供固定响应
class StubJobRepository implements IJobRepository {
  async findById(id: string): Promise<Job | null> {
    return JobFixture.createDefault(); // 总是返回固定任务
  }
}

// ==================== Spy ====================
// 记录调用信息
class SpyJobRepository implements IJobRepository {
  findByIdCalls: string[] = [];

  async findById(id: string): Promise<Job | null> {
    this.findByIdCalls.push(id); // 记录调用
    return null;
  }
}

// ==================== Mock ====================
// 预设行为并验证交互
class MockJobRepository implements IJobRepository {
  private expectedJob: Job;
  saveWasCalled = false;

  setupSave(job: Job): void {
    this.expectedJob = job;
  }

  async save(job: Job): Promise<void> {
    this.saveWasCalled = true;
    expect(job).toEqual(this.expectedJob);
  }

  verify(): void {
    if (!this.saveWasCalled) {
      throw new Error('save 方法未被调用');
    }
  }
}

// ==================== Fake ====================
// 简化的工作实现（如内存数据库）
class FakeJobRepository implements IJobRepository {
  private jobs: Map<string, Job> = new Map();

  async save(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.jobs.delete(id);
  }
}
```

---

## 二、Jest Mock 使用

### 2.1 基本 Mock 创建

```typescript
// ==================== 手动创建 Mock ====================
import { IJobRepository } from './job.repository.interface';

class MockJobRepository implements IJobRepository {
  private jobs: Map<string, Job> = new Map();
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

  // 测试辅助方法
  setupJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  clear(): void {
    this.jobs.clear();
    this.saveCalls = [];
    this.findByIdCalls = [];
  }
}

// ==================== 使用 Jest.fn() ====================
const mockSave = jest.fn();
const mockFindById = jest.fn();

// 设置返回值
mockFindById.mockResolvedValue(JobFixture.createDefault());

// 验证调用
expect(mockSave).toHaveBeenCalledWith(expect.any(Job));
expect(mockSave).toHaveBeenCalledTimes(1);
```

### 2.2 Mock 整个模块

```typescript
// ==================== 使用 jest.mock() ====================
import { EmailService } from './email.service';

jest.mock('./email.service');

describe('JobService', () => {
  let jobService: JobService;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockEmailService = new EmailService() as jest.Mocked<EmailService>;
    jobService = new JobService(mockEmailService);
  });

  it('should send email when job is submitted', async () => {
    // Arrange
    const job = JobFixture.createWithTasks(2);
    mockEmailService.sendEmail.mockResolvedValue(undefined);

    // Act
    await jobService.submitJob(job);

    // Assert
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
      to: job.customerEmail,
      subject: '任务确认',
      body: expect.stringContaining(job.id)
    });
  });
});
```

### 2.3 Mock 返回值

```typescript
// ==================== Mock 一次性返回值 ====================
mockFindById.mockReturnValueOnce(job1);
mockFindById.mockReturnValueOnce(job2);

const result1 = await repo.findById('1'); // 返回 job1
const result2 = await repo.findById('2'); // 返回 job2
const result3 = await repo.findById('3'); // 返回 undefined

// ==================== Mock 持续返回值 ====================
mockFindById.mockReturnValue(defaultJob);

const result1 = await repo.findById('1'); // 返回 defaultJob
const result2 = await repo.findById('2'); // 返回 defaultJob

// ==================== Mock 异步返回值 ====================
mockFindById.mockResolvedValue(job);
mockFindById.mockRejectedValue(new Error('数据库错误'));

// ==================== Mock 实现 ====================
mockCalculateBudget.mockImplementation((tasks: JobTask[]) => {
  return tasks.reduce((sum, task) => sum + task.budget, 0);
});
```

### 2.4 验证 Mock 调用

```typescript
// ==================== 验证调用次数 ====================
expect(mockSave).toHaveBeenCalledTimes(1);
expect(mockSave).not.toHaveBeenCalled();

// ==================== 验证调用参数 ====================
expect(mockSave).toHaveBeenCalledWith(job);
expect(mockSave).toHaveBeenCalledWith(
  expect.objectContaining({
    customerId: 'customer-123'
  })
);

// ==================== 验证最后一次调用 ====================
expect(mockSave).toHaveBeenLastCalledWith(job);

// ==================== 验证所有调用 ====================
expect(mockSave).toHaveBeenNthCalledWith(1, job1);
expect(mockSave).toHaveBeenNthCalledWith(2, job2);
```

---

## 三、Mock 在 DDD 中的应用

### 3.1 Mock 仓储

```typescript
// job.repository.mock.ts
export class MockJobRepository implements IJobRepository {
  private jobs: Map<string, Job> = new Map();
  
  // 记录方法调用（用于验证）
  saveCalls: Job[] = [];
  findByIdCalls: string[] = [];
  deleteCalls: string[] = [];

  async save(job: Job): Promise<void> {
    this.saveCalls.push(job);
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<Job | null> {
    this.findByIdCalls.push(id);
    return this.jobs.get(id) ?? null;
  }

  async findByCustomerId(customerId: string): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter(j => j.customerId === customerId);
  }

  async delete(id: string): Promise<void> {
    this.deleteCalls.push(id);
    this.jobs.delete(id);
  }

  // ==================== 测试辅助方法 ====================
  
  /**
   * 设置预定义的任务
   */
  setupJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  /**
   * 设置多个任务
   */
  setupJobs(jobs: Job[]): void {
    jobs.forEach(job => this.jobs.set(job.id, job));
  }

  /**
   * 设置空仓储
   */
  setupEmpty(): void {
    this.jobs.clear();
  }

  /**
   * 检查任务是否存在
   */
  hasJob(id: string): boolean {
    return this.jobs.has(id);
  }

  /**
   * 获取所有任务
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 清空所有状态
   */
  clear(): void {
    this.jobs.clear();
    this.saveCalls = [];
    this.findByIdCalls = [];
    this.deleteCalls = [];
  }
}

// 使用示例
describe('CreateJobHandler', () => {
  let handler: CreateJobHandler;
  let mockJobRepo: MockJobRepository;

  beforeEach(() => {
    mockJobRepo = new MockJobRepository();
    handler = new CreateJobHandler(mockJobRepo);
  });

  it('should save job', async () => {
    // Arrange
    const command = CreateJobCommandFixture.createDefault();

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(mockJobRepo.saveCalls).toHaveLength(1);
    expect(mockJobRepo.saveCalls[0].customerId).toBe(command.customerId);
  });
});
```

### 3.2 Mock 事件总线

```typescript
// event-bus.mock.ts
export class MockEventBus implements IEventBus {
  publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void>;
  async publish(events: DomainEvent[]): Promise<void>;
  async publish(eventOrEvents: DomainEvent | DomainEvent[]): Promise<void> {
    const events = Array.isArray(eventOrEvents) 
      ? eventOrEvents 
      : [eventOrEvents];
    this.publishedEvents.push(...events);
  }

  // ==================== 测试辅助方法 ====================

  /**
   * 获取指定类型的所有事件
   */
  getEventsByType<T extends DomainEvent>(eventType: string): T[] {
    return this.publishedEvents
      .filter(e => e.eventName === eventType) as T[];
  }

  /**
   * 获取最后一次发布的事件
   */
  getLastEvent(): DomainEvent | undefined {
    return this.publishedEvents[this.publishedEvents.length - 1];
  }

  /**
   * 验证是否发布了特定事件
   */
  hasPublishedEvent(eventType: string): boolean {
    return this.publishedEvents.some(e => e.eventName === eventType);
  }

  /**
   * 清空所有事件
   */
  clear(): void {
    this.publishedEvents = [];
  }
}

// 使用示例
describe('Job', () => {
  it('should emit JobCreatedEvent when created', () => {
    // Arrange & Act
    const job = Job.create({
      customerId: 'customer-123',
      tenantId: 'tenant-456'
    }).value;

    // Assert
    const events = job.domainEvents;
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('JobCreated');
    expect(events[0].aggregateId).toBe(job.id);
  });
});

describe('CreateJobHandler', () => {
  it('should publish event via event bus', async () => {
    // Arrange
    const mockEventBus = new MockEventBus();
    const handler = new CreateJobHandler(
      mockJobRepo,
      mockEventBus
    );

    // Act
    await handler.execute(command);

    // Assert
    expect(mockEventBus.publishedEvents).toHaveLength(1);
    expect(mockEventBus.hasPublishedEvent('JobCreated')).toBe(true);
  });
});
```

### 3.3 Mock 领域服务

```typescript
// pricing-service.mock.ts
export class MockPricingService implements IPricingService {
  private mockCalculateBudget: jest.Mock;
  
  constructor() {
    this.mockCalculateBudget = jest.fn();
  }

  async calculateJobBudget(job: Job, customerId: string): Promise<Money> {
    return this.mockCalculateBudget(job, customerId);
  }

  // ==================== 测试辅助方法 ====================

  /**
   * 设置计算预算的返回值
   */
  setupBudget(budget: Money): void {
    this.mockCalculateBudget.mockResolvedValue(budget);
  }

  /**
   * 设置抛出异常
   */
  setupError(error: Error): void {
    this.mockCalculateBudget.mockRejectedValue(error);
  }

  /**
   * 验证调用
   */
  verifyCalculateBudgetWasCalled(job: Job, customerId: string): void {
    expect(this.mockCalculateBudget).toHaveBeenCalledWith(job, customerId);
  }
}

// 使用示例
describe('JobService', () => {
  let jobService: JobService;
  let mockPricingService: MockPricingService;

  beforeEach(() => {
    mockPricingService = new MockPricingService();
    jobService = new JobService(mockPricingService);
  });

  it('should use pricing service to calculate budget', async () => {
    // Arrange
    const job = JobFixture.createWithTasks(2);
    mockPricingService.setupBudget(Money.of(200));

    // Act
    const result = await jobService.calculateTotalBudget(job);

    // Assert
    expect(result).toEqual(Money.of(200));
    mockPricingService.verifyCalculateBudgetWasCalled(job, job.customerId);
  });
});
```

---

## 四、最佳实践

### 4.1 Mock 使用原则

```typescript
// ✅ 正确 - Mock 外部依赖，测试业务逻辑
it('should save job to repository', async () => {
  const mockRepo = new MockJobRepository();
  const handler = new CreateJobHandler(mockRepo);

  await handler.execute(command);

  expect(mockRepo.saveCalls).toHaveLength(1);
});

// ❌ 错误 - Mock 被测对象本身
it('should save job', async () => {
  const mockJob = {
    save: jest.fn()
  };

  await mockJob.save();

  expect(mockJob.save).toHaveBeenCalled();
  // 这只是在测试 Mock，不是测试真实代码
});
```

### 4.2 Mock 粒度控制

```typescript
// ✅ 正确 - 只 Mock 直接依赖
describe('JobService', () => {
  it('should create job', async () => {
    const mockJobRepo = new MockJobRepository();
    const jobService = new JobService(mockJobRepo);
    
    await jobService.createJob(props);
    
    expect(mockJobRepo.saveCalls).toHaveLength(1);
  });
});

// ❌ 错误 - 过度 Mock，测试变得脆弱
it('should create job', async () => {
  const mockRepo = new MockJobRepository();
  mockRepo.findById.mockResolvedValue(null);
  mockRepo.save.mockResolvedValue(undefined);
  mockRepo.findByName.mockResolvedValue(null);
  mockRepo.checkConstraints.mockResolvedValue(true);
  // ... 太多 Mock 设置
});
```

### 4.3 避免测试实现细节

```typescript
// ❌ 错误 - 测试实现细节
it('should call private method', () => {
  const service = new JobService();
  const spy = jest.spyOn(service as any, 'validateJob');

  service.createJob(props);

  expect(spy).toHaveBeenCalled();
});

// ✅ 正确 - 测试可见行为
it('should reject invalid job', () => {
  const service = new JobService();
  const invalidProps = { customerId: '' };

  const result = service.createJob(invalidProps);

  expect(result.isFail()).toBe(true);
  expect(result.value.message).toContain('customerId');
});
```

### 4.4 使用有意义的 Mock 数据

```typescript
// ❌ 错误 - 无意义的数据
const mockJob = {
  id: '1',
  customerId: '2',
  tasks: []
};

// ✅ 正确 - 有意义的数据
const mockJob = JobFixture.createDefault({
  id: 'job-123',
  customerId: 'customer-456',
  tasks: [
    { taskId: 'task-789', budget: 2000 }
  ]
});
```

---

## 五、常见场景

### 5.1 Mock 异步操作

```typescript
describe('JobService', () => {
  it('should handle async repository errors', async () => {
    // Arrange
    const mockRepo = new MockJobRepository();
    mockRepo.save = jest.fn()
      .mockRejectedValueOnce(new Error('数据库连接失败'))
      .mockResolvedValueOnce(undefined);

    const service = new JobService(mockRepo);

    // Act & Assert
    const result1 = await service.createJob(props);
    expect(result1.isFail()).toBe(true);

    const result2 = await service.createJob(props);
    expect(result2.isOk()).toBe(true);
  });
});
```

### 5.2 Mock 时间

```typescript
describe('Job', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-20T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should set submittedAt to current time', () => {
    const job = JobFixture.createWithTasks(2);
    
    job.submit();

    expect(job.submittedAt).toEqual(new Date('2026-02-20T10:00:00Z'));
  });
});
```

### 5.3 Mock 单例

```typescript
// ==================== 使用 jest.spyOn ====================
import { ConfigService } from './config.service';

describe('JobService', () => {
  it('should use config from ConfigService', () => {
    const mockGet = jest.spyOn(ConfigService, 'get')
      .mockReturnValue('test-value');

    const service = new JobService();

    expect(service.maxTasks).toBe('test-value');

    mockGet.mockRestore();
  });
});
```

---

## 六、Mock 验证模式

### 6.1 状态验证 vs 行为验证

```typescript
// ==================== 状态验证 ====================
it('should save job (state verification)', async () => {
  const mockRepo = new MockJobRepository();
  const handler = new CreateJobHandler(mockRepo);

  await handler.execute(command);

  // 验证仓储状态
  expect(mockRepo.hasJob(jobId)).toBe(true);
  const savedJob = await mockRepo.findById(jobId);
  expect(savedJob).not.toBeNull();
});

// ==================== 行为验证 ====================
it('should save job (behavior verification)', async () => {
  const mockRepo = new MockJobRepository();
  const handler = new CreateJobHandler(mockRepo);

  await handler.execute(command);

  // 验证方法调用
  expect(mockRepo.saveCalls).toHaveLength(1);
  expect(mockRepo.saveCalls[0].customerId).toBe('customer-123');
});
```

### 6.2 组合验证

```typescript
it('should create job and publish event', async () => {
  // Arrange
  const mockRepo = new MockJobRepository();
  const mockEventBus = new MockEventBus();
  const handler = new CreateJobHandler(mockRepo, mockEventBus);

  // Act
  const result = await handler.execute(command);

  // Assert - 组合验证
  expect(result.isOk()).toBe(true);                    // 返回值验证
  expect(mockRepo.saveCalls).toHaveLength(1);         // 行为验证
  expect(mockEventBus.publishedEvents).toHaveLength(1); // 行为验证
  expect(mockRepo.hasJob(result.value.id)).toBe(true); // 状态验证
});
```

---

## 七、清理与重置

### 7.1 清理 Mock 状态

```typescript
describe('JobService', () => {
  let mockRepo: MockJobRepository;

  beforeEach(() => {
    mockRepo = new MockJobRepository();
  });

  afterEach(() => {
    mockRepo.clear(); // 清理状态
    jest.clearAllMocks(); // 清理 Jest Mock
  });

  it('test 1', async () => {
    // mockRepo 是干净的
  });

  it('test 2', async () => {
    // mockRepo 是干净的
  });
});
```

### 7.2 恢复原始实现

```typescript
describe('JobService', () => {
  let originalImplementation: any;

  beforeAll(() => {
    originalImplementation = EmailService.send;
  });

  afterAll(() => {
    EmailService.send = originalImplementation;
  });

  it('should send email', async () => {
    EmailService.send = jest.fn().mockResolvedValue(undefined);

    // 测试...
  });
});
```

---

[下一章：集成测试 →](./08-integration-testing.md)
