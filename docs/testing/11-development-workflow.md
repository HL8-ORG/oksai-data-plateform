# 开发工作流程：用户故事 → BDD → TDD

[返回目录](./README.md) | [上一章：CI/CD集成](./10-ci-cd-integration.md)

---

## 一、工作流程概览

### 1.1 完整开发流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              开发工作流程                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  用户故事     │ →  │  BDD 场景    │ →  │  TDD 循环    │ →  │  代码实现    │
│  User Story  │    │  Scenario    │    │  Red-Green   │    │  Production  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       ↓                   ↓                   ↓                   ↓
   业务需求            验收标准            单元测试            领域代码
   业务语言            Gherkin语法         技术实现            基础设施
```

### 1.2 各阶段目标

| 阶段 | 目标 | 产出物 | 参与者 |
|:---|:---|:---|:---|
| **用户故事** | 明确业务需求 | 用户故事卡片 | 产品经理、用户 |
| **BDD 场景** | 定义验收标准 | Feature 文件 | 产品经理、开发者、测试 |
| **TDD 循环** | 驱动代码设计 | 单元测试 + 实现 | 开发者 |
| **代码实现** | 完成功能开发 | 生产代码 | 开发者 |

---

## 二、阶段一：用户故事（User Story）

### 2.1 用户故事模板

```gherkin
作为 <角色>
我想要 <功能>
以便于 <价值>
```

### 2.2 用户故事示例

```gherkin
Feature: 任务管理

作为 项目经理
我想要 创建和管理项目任务
以便于 跟踪项目进度和资源分配
```

### 2.3 用户故事验收标准（INVEST 原则）

| 原则 | 说明 | 检查点 |
|:---|:---|:---|
| **I**ndependent | 独立性 | 故事之间没有依赖关系 |
| **N**egotiable | 可协商 | 细节可以讨论 |
| **V**aluable | 有价值 | 对用户有明确价值 |
| **E**stimable | 可估算 | 能够估算工作量 |
| **S**mall | 足够小 | 一个迭代内能完成 |
| **T**estable | 可测试 | 有明确的验收标准 |

---

## 三、阶段二：BDD 场景设计

### 3.1 从用户故事到场景

```
用户故事 → 拆分场景 → 编写 Gherkin → 定义步骤
```

### 3.2 场景设计示例

```gherkin
# features/job-management.feature
Feature: 任务管理
  作为项目经理
  我想要创建和管理项目任务
  以便于跟踪项目进度和资源分配

  Background:
    Given 系统中存在租户 "tenant-001"
    And 存在客户 "customer-001" 属于租户 "tenant-001"

  @happy-path
  Scenario: 成功创建包含任务项的任务
    Given 用户 "manager-001" 已登录系统
    And 用户有创建任务的权限
    When 用户创建一个任务:
      | 字段         | 值               |
      | 客户ID       | customer-001     |
      | 任务名称     | 网站开发项目     |
    And 添加以下任务项:
      | 任务项ID   | 名称       | 预算   |
      | task-001  | 前端开发   | 5000   |
      | task-002  | 后端开发   | 8000   |
    Then 任务创建成功
    And 任务状态为 "draft"
    And 任务总预算为 13000
    And 系统触发 "JobCreated" 事件

  @validation
  Scenario: 创建任务时预算不能为负数
    Given 用户 "manager-001" 已登录系统
    When 用户创建一个任务:
      | 字段         | 值               |
      | 客户ID       | customer-001     |
      | 任务名称     | 测试项目         |
    And 添加任务项:
      | 任务项ID   | 名称     | 预算    |
      | task-001  | 开发     | -1000   |
    Then 任务创建失败
    And 错误信息包含 "预算不能为负数"

  @business-rule
  Scenario: 超出客户预算时创建失败
    Given 客户 "customer-001" 的总预算为 10000
    And 已使用预算 8000
    When 用户创建一个任务:
      | 字段         | 值               |
      | 客户ID       | customer-001     |
      | 任务名称     | 新项目           |
    And 添加任务项:
      | 任务项ID   | 名称     | 预算    |
      | task-001  | 开发     | 5000    |
    Then 任务创建失败
    And 错误信息包含 "超出客户剩余预算"
```

### 3.3 步骤定义实现

```typescript
// features/step-definitions/job.steps.ts
import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from 'chai';
import { Job } from '../../src/domain/job.aggregate';
import { JobCreateCommand } from '../../src/application/commands/create-job.command';
import { Money } from '../../src/domain/value-objects/money.vo';

let currentUser: User;
let currentTenant: string;
let result: Result<Job, Error>;
let errorMessage: string;

// ==================== Background ====================

Given('系统中存在租户 {string}', async (tenantId: string) => {
  currentTenant = tenantId;
  await tenantRepository.create({ id: tenantId });
});

Given('存在客户 {string} 属于租户 {string}', async (customerId: string, tenantId: string) => {
  await customerRepository.create({
    id: customerId,
    tenantId,
    totalBudget: 100000
  });
});

// ==================== Given ====================

Given('用户 {string} 已登录系统', async (userId: string) => {
  currentUser = await userRepository.findById(userId);
});

Given('用户有创建任务的权限', () => {
  // 权限检查在应用层处理
});

Given('客户 {string} 的总预算为 {int}', async (customerId: string, budget: number) => {
  await customerRepository.update(customerId, { totalBudget: budget });
});

Given('已使用预算 {int}', async (usedBudget: number) => {
  await customerRepository.updateUsedBudget('customer-001', usedBudget);
});

// ==================== When ====================

When('用户创建一个任务:', async (table: DataTable) => {
  const data = table.rowsHash();
  
  const command = new JobCreateCommand({
    customerId: data['客户ID'],
    tenantId: currentTenant,
    name: data['任务名称'],
    createdBy: currentUser.id
  });

  result = await jobService.createJob(command);
});

When('添加以下任务项:', async (table: DataTable) => {
  const tasks = table.hashes().map(row => ({
    taskId: row['任务项ID'],
    name: row['名称'],
    budget: parseInt(row['预算'])
  }));

  if (result.isOk()) {
    const job = result.value;
    for (const task of tasks) {
      job.addTask({
        taskId: task.taskId,
        name: task.name,
        budget: Money.of(task.budget)
      });
    }
  }
});

When('添加任务项:', async (table: DataTable) => {
  // 单个任务项添加逻辑
  const row = table.rowsHash();
  if (result.isOk()) {
    result.value.addTask({
      taskId: row['任务项ID'],
      name: row['名称'],
      budget: Money.of(parseInt(row['预算']))
    });
  }
});

// ==================== Then ====================

Then('任务创建成功', () => {
  expect(result.isOk()).to.be.true;
});

Then('任务创建失败', () => {
  expect(result.isFail()).to.be.true;
  errorMessage = result.value.message;
});

Then('任务状态为 {string}', (status: string) => {
  expect(result.value.status).to.equal(status);
});

Then('任务总预算为 {int}', (budget: number) => {
  expect(result.value.totalBudget.amount).to.equal(budget);
});

Then('系统触发 {string} 事件', (eventName: string) => {
  const events = result.value.domainEvents;
  expect(events.some(e => e.eventName === eventName)).to.be.true;
});

Then('错误信息包含 {string}', (message: string) => {
  expect(errorMessage).to.include(message);
});
```

---

## 四、阶段三：TDD 开发循环

### 4.1 双循环开发模式

```
┌─────────────────────────────────────────────────────────────────┐
│                    外层循环：BDD                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Feature: 任务管理                                        │  │
│  │  Scenario: 成功创建包含任务项的任务                        │  │
│  │    Given... When... Then...                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              内层循环：TDD                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  🔴 Red: 编写失败的单元测试                         │  │  │
│  │  │  🟢 Green: 用最简单的方式让测试通过                 │  │  │
│  │  │  🔵 Refactor: 优化代码，保持测试通过                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 TDD 循环一：创建 Job 聚合根

#### 🔴 Red: 编写失败的测试

```typescript
// job.aggregate.spec.ts
describe('Job', () => {
  describe('create', () => {
    it('should create job with valid props', () => {
      // Arrange & Act
      const result = Job.create({
        customerId: 'customer-001',
        tenantId: 'tenant-001',
        name: '网站开发项目',
        createdBy: 'user-001'
      });

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value.customerId).toBe('customer-001');
      expect(result.value.tenantId).toBe('tenant-001');
      expect(result.value.name).toBe('网站开发项目');
      expect(result.value.status).toBe('draft');
    });

    it('should fail when customerId is empty', () => {
      const result = Job.create({
        customerId: '',
        tenantId: 'tenant-001',
        name: '测试项目',
        createdBy: 'user-001'
      });

      expect(result.isFail()).toBe(true);
      expect(result.value.message).toContain('客户ID不能为空');
    });

    it('should emit JobCreatedEvent when created', () => {
      const result = Job.create({
        customerId: 'customer-001',
        tenantId: 'tenant-001',
        name: '网站开发项目',
        createdBy: 'user-001'
      });

      expect(result.value.domainEvents).toHaveLength(1);
      expect(result.value.domainEvents[0].eventName).toBe('JobCreated');
    });
  });
});
```

#### 🟢 Green: 最简实现

```typescript
// job.aggregate.ts
export class Job extends AggregateRoot<JobProps> {
  private constructor(props: JobProps) {
    super(props);
  }

  static create(props: CreateJobProps): Result<Job, ValidationError> {
    // 验证
    if (!props.customerId || props.customerId.trim() === '') {
      return Result.fail(new ValidationError('客户ID不能为空', 'customerId'));
    }

    if (!props.tenantId || props.tenantId.trim() === '') {
      return Result.fail(new ValidationError('租户ID不能为空', 'tenantId'));
    }

    // 创建
    const job = new Job({
      id: JobId.generate(),
      customerId: props.customerId,
      tenantId: props.tenantId,
      name: props.name,
      status: 'draft',
      tasks: [],
      totalBudget: Money.zero(),
      createdBy: props.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 触发事件
    job.addDomainEvent(new JobCreatedEvent({
      jobId: job.id,
      customerId: job.customerId,
      tenantId: job.tenantId
    }));

    return Result.ok(job);
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): string {
    return this.props.status;
  }

  get tasks(): JobTask[] {
    return this.props.tasks;
  }

  get totalBudget(): Money {
    return this.props.totalBudget;
  }
}
```

#### 🔵 Refactor: 优化代码

```typescript
// job.aggregate.ts
export class Job extends AggregateRoot<JobProps> {
  private constructor(props: JobProps) {
    super(props);
  }

  static create(props: CreateJobProps): Result<Job, ValidationError> {
    const errors = this.validate(props);
    if (errors.length > 0) {
      return Result.fail(errors[0]);
    }

    const job = new Job(this.initializeProps(props));
    job.emitCreatedEvent();

    return Result.ok(job);
  }

  private static validate(props: CreateJobProps): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!props.customerId?.trim()) {
      errors.push(new ValidationError('客户ID不能为空', 'customerId'));
    }

    if (!props.tenantId?.trim()) {
      errors.push(new ValidationError('租户ID不能为空', 'tenantId'));
    }

    return errors;
  }

  private static initializeProps(props: CreateJobProps): JobProps {
    return {
      id: JobId.generate(),
      customerId: props.customerId,
      tenantId: props.tenantId,
      name: props.name,
      status: JobStatus.DRAFT,
      tasks: [],
      totalBudget: Money.zero(),
      createdBy: props.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private emitCreatedEvent(): void {
    this.addDomainEvent(new JobCreatedEvent({
      jobId: this.id,
      customerId: this.customerId,
      tenantId: this.tenantId
    }));
  }
}
```

### 4.3 TDD 循环二：添加任务项

#### 🔴 Red: 编写失败的测试

```typescript
// job.aggregate.spec.ts
describe('Job', () => {
  describe('addTask', () => {
    it('should add task to draft job', () => {
      const job = JobFixture.createDefault();

      job.addTask({
        taskId: 'task-001',
        name: '前端开发',
        budget: Money.of(5000)
      });

      expect(job.tasks).toHaveLength(1);
      expect(job.tasks[0].name).toBe('前端开发');
      expect(job.totalBudget.amount).toBe(5000);
    });

    it('should increase total budget when task is added', () => {
      const job = JobFixture.createDefault();

      job.addTask({ taskId: 'task-001', name: '任务1', budget: Money.of(3000) });
      job.addTask({ taskId: 'task-002', name: '任务2', budget: Money.of(2000) });

      expect(job.totalBudget.amount).toBe(5000);
    });

    it('should throw error when adding task to submitted job', () => {
      const job = JobFixture.createDefault();
      job.submit();

      expect(() => {
        job.addTask({ taskId: 'task-001', name: '新任务', budget: Money.of(1000) });
      }).toThrow('不能向已提交的任务添加任务项');
    });

    it('should emit TaskAddedEvent when task is added', () => {
      const job = JobFixture.createDefault();
      job.clearDomainEvents();

      job.addTask({
        taskId: 'task-001',
        name: '前端开发',
        budget: Money.of(5000)
      });

      expect(job.domainEvents).toHaveLength(1);
      expect(job.domainEvents[0].eventName).toBe('TaskAdded');
    });
  });
});
```

#### 🟢 Green: 最简实现

```typescript
// job.aggregate.ts
export class Job extends AggregateRoot<JobProps> {
  addTask(props: AddTaskProps): void {
    if (this.props.status !== JobStatus.DRAFT) {
      throw new Error('不能向已提交的任务添加任务项');
    }

    const task = new JobTask({
      taskId: props.taskId,
      name: props.name,
      budget: props.budget
    });

    this.props.tasks.push(task);
    this.recalculateBudget();
    this.touch();

    this.addDomainEvent(new TaskAddedEvent({
      jobId: this.id,
      taskId: task.taskId,
      name: task.name,
      budget: task.budget
    }));
  }

  private recalculateBudget(): void {
    this.props.totalBudget = this.props.tasks.reduce(
      (total, task) => total.add(task.budget),
      Money.zero()
    );
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
```

### 4.4 TDD 循环三：提交任务

#### 🔴 Red: 编写失败的测试

```typescript
// job.aggregate.spec.ts
describe('Job', () => {
  describe('submit', () => {
    it('should submit job with tasks', () => {
      const job = JobFixture.createWithTasks(2);

      job.submit();

      expect(job.status).toBe('submitted');
      expect(job.submittedAt).toBeDefined();
    });

    it('should throw error when submitting empty job', () => {
      const job = JobFixture.createDefault();

      expect(() => job.submit()).toThrow('不能提交空任务');
    });

    it('should throw error when job is already submitted', () => {
      const job = JobFixture.createWithTasks(1);
      job.submit();

      expect(() => job.submit()).toThrow('任务已提交');
    });

    it('should emit JobSubmittedEvent when submitted', () => {
      const job = JobFixture.createWithTasks(1);
      job.clearDomainEvents();

      job.submit();

      expect(job.domainEvents).toHaveLength(1);
      expect(job.domainEvents[0].eventName).toBe('JobSubmitted');
    });
  });
});
```

#### 🟢 Green: 最简实现

```typescript
// job.aggregate.ts
export class Job extends AggregateRoot<JobProps> {
  submit(): void {
    if (this.props.status !== JobStatus.DRAFT) {
      throw new Error('任务已提交');
    }

    if (this.props.tasks.length === 0) {
      throw new Error('不能提交空任务');
    }

    this.props.status = JobStatus.SUBMITTED;
    this.props.submittedAt = new Date();
    this.touch();

    this.addDomainEvent(new JobSubmittedEvent({
      jobId: this.id,
      submittedAt: this.submittedAt!,
      taskCount: this.tasks.length,
      totalBudget: this.totalBudget
    }));
  }

  get submittedAt(): Date | undefined {
    return this.props.submittedAt;
  }
}
```

---

## 五、阶段四：应用层与基础设施层

### 5.1 Command Handler TDD

```typescript
// create-job.handler.spec.ts
describe('CreateJobHandler', () => {
  let handler: CreateJobHandler;
  let mockJobRepo: MockJobRepository;
  let mockCustomerRepo: MockCustomerRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockJobRepo = new MockJobRepository();
    mockCustomerRepo = new MockCustomerRepository();
    mockEventBus = new MockEventBus();
    handler = new CreateJobHandler(mockJobRepo, mockCustomerRepo, mockEventBus);
  });

  describe('execute', () => {
    it('should create job successfully', async () => {
      // Arrange
      mockCustomerRepo.setupCustomer(CustomerFixture.createDefault());
      const command = CreateJobCommandFixture.createDefault();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockJobRepo.saveCalls).toHaveLength(1);
    });

    it('should fail when customer does not exist', async () => {
      // Arrange
      mockCustomerRepo.setupEmpty();
      const command = CreateJobCommandFixture.createDefault();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFail()).toBe(true);
      expect(result.value.message).toContain('客户不存在');
    });

    it('should publish events after saving', async () => {
      // Arrange
      mockCustomerRepo.setupCustomer(CustomerFixture.createDefault());
      const command = CreateJobCommandFixture.createDefault();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publishedEvents).toHaveLength(1);
      expect(mockEventBus.hasPublishedEvent('JobCreated')).toBe(true);
    });
  });
});
```

### 5.2 Command Handler 实现

```typescript
// create-job.handler.ts
@CommandHandler(CreateJobCommand)
export class CreateJobHandler implements ICommandHandler<CreateJobCommand, Result<string>> {
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateJobCommand): Promise<Result<string, ApplicationError>> {
    // 1. 验证客户存在
    const customer = await this.customerRepository.findById(command.customerId);
    if (!customer) {
      return Result.fail(new ApplicationError('客户不存在', 'CUSTOMER_NOT_FOUND'));
    }

    // 2. 创建任务
    const createResult = Job.create({
      customerId: command.customerId,
      tenantId: command.tenantId,
      name: command.name,
      createdBy: command.userId
    });

    if (createResult.isFail()) {
      return Result.fail(new ApplicationError(createResult.value.message, 'VALIDATION_ERROR'));
    }

    const job = createResult.value;

    // 3. 保存任务
    await this.jobRepository.save(job);

    // 4. 发布领域事件
    await this.eventBus.publishAll(job.domainEvents);
    job.clearDomainEvents();

    return Result.ok(job.id);
  }
}
```

---

## 六、完整工作流程示例

### 6.1 示例：实现"客户预算检查"功能

#### Step 1: 编写用户故事

```gherkin
作为 项目经理
我想要 在创建任务时检查客户预算
以便于 防止超出客户预算范围
```

#### Step 2: 编写 BDD 场景

```gherkin
# features/job-budget-check.feature
Feature: 任务预算检查

  Scenario: 任务预算在客户剩余预算内创建成功
    Given 客户 "customer-001" 的总预算为 10000
    And 已使用预算 5000
    When 创建预算为 4000 的任务
    Then 任务创建成功
    And 客户剩余预算为 1000

  Scenario: 任务预算超出客户剩余预算创建失败
    Given 客户 "customer-001" 的总预算为 10000
    And 已使用预算 8000
    When 创建预算为 5000 的任务
    Then 任务创建失败
    And 错误信息为 "超出客户剩余预算"
```

#### Step 3: TDD 循环

```typescript
// 🔴 Red
describe('Job', () => {
  describe('checkBudget', () => {
    it('should pass when budget is within customer remaining budget', () => {
      const customer = CustomerFixture.create({ 
        totalBudget: 10000, 
        usedBudget: 5000 
      });
      const job = JobFixture.createWithBudget(4000);

      const result = job.checkBudgetAvailability(customer);

      expect(result.isOk()).toBe(true);
    });

    it('should fail when budget exceeds customer remaining budget', () => {
      const customer = CustomerFixture.create({ 
        totalBudget: 10000, 
        usedBudget: 8000 
      });
      const job = JobFixture.createWithBudget(5000);

      const result = job.checkBudgetAvailability(customer);

      expect(result.isFail()).toBe(true);
      expect(result.value.message).toBe('超出客户剩余预算');
    });
  });
});

// 🟢 Green
export class Job extends AggregateRoot<JobProps> {
  checkBudgetAvailability(customer: Customer): Result<void, BusinessRuleError> {
    const remainingBudget = customer.remainingBudget;
    
    if (this.totalBudget.isGreaterThan(remainingBudget)) {
      return Result.fail(new BusinessRuleError('超出客户剩余预算'));
    }
    
    return Result.ok();
  }
}
```

#### Step 4: 在 Handler 中应用

```typescript
// create-job.handler.ts
async execute(command: CreateJobCommand): Promise<Result<string, ApplicationError>> {
  const customer = await this.customerRepository.findById(command.customerId);
  
  const job = Job.create({ ... }).value;

  // 预算检查
  const budgetCheck = job.checkBudgetAvailability(customer);
  if (budgetCheck.isFail()) {
    return Result.fail(new ApplicationError(budgetCheck.value.message));
  }

  await this.jobRepository.save(job);
  // ...
}
```

#### Step 5: 验证 BDD 场景通过

```bash
$ pnpm run test:bdd

Feature: 任务预算检查
  Scenario: 任务预算在客户剩余预算内创建成功
    ✅ Given 客户 "customer-001" 的总预算为 10000
    ✅ And 已使用预算 5000
    ✅ When 创建预算为 4000 的任务
    ✅ Then 任务创建成功
    ✅ And 客户剩余预算为 1000

  Scenario: 任务预算超出客户剩余预算创建失败
    ✅ Given 客户 "customer-001" 的总预算为 10000
    ✅ And 已使用预算 8000
    ✅ When 创建预算为 5000 的任务
    ✅ Then 任务创建失败
    ✅ And 错误信息为 "超出客户剩余预算"

2 scenarios (2 passed)
12 steps (12 passed)
```

---

## 七、开发检查清单

### 7.1 用户故事检查清单

- [ ] 使用标准模板（作为...我想要...以便于...）
- [ ] 符合 INVEST 原则
- [ ] 有明确的验收标准
- [ ] 已与产品经理确认需求

### 7.2 BDD 场景检查清单

- [ ] 覆盖正常流程（Happy Path）
- [ ] 覆盖异常流程（Error Cases）
- [ ] 覆盖边界条件（Edge Cases）
- [ ] 场景独立、可重复执行
- [ ] 步骤定义清晰

### 7.3 TDD 循环检查清单

- [ ] 先写失败的测试（Red）
- [ ] 用最简代码让测试通过（Green）
- [ ] 优化代码结构（Refactor）
- [ ] 测试覆盖所有业务规则
- [ ] 测试命名清晰表达意图

### 7.4 代码实现检查清单

- [ ] 领域逻辑在聚合根/实体中
- [ ] 值对象不可变
- [ ] 领域事件正确触发
- [ ] 仓储接口定义在领域层
- [ ] 基础设施实现正确

---

## 八、常用命令

```bash
# 运行 BDD 测试
pnpm run test:bdd

# 运行单元测试（TDD）
pnpm run test:unit

# 监听模式运行测试
pnpm run test:watch

# 运行特定测试文件
pnpm run test:unit job.aggregate.spec.ts

# 运行测试并生成覆盖率
pnpm run test:coverage

# 运行所有测试
pnpm run test:all
```

---

[返回目录](./README.md)
