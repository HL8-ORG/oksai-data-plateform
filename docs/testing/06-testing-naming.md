# 测试命名规范

[返回目录](./README.md) | [上一章：DDD架构中的测试](./05-testing-in-ddd.md)

---

## 一、测试文件命名

### 1.1 基本命名规则

| 测试类型 | 文件后缀 | 用途 | 示例 |
|:---|:---|:---|:---|
| **单元测试** | `.spec.ts` | 测试单个类/函数 | `job.aggregate.spec.ts` |
| **集成测试** | `.int-spec.ts` | 测试组件集成 | `postgres-job.repository.int-spec.ts` |
| **端到端测试** | `.e2e-spec.ts` | 测试完整流程 | `job-submission.e2e-spec.ts` |
| **性能测试** | `.perf-spec.ts` | 性能基准测试 | `api-throughput.perf-spec.ts` |

### 1.2 文件命名模式

```typescript
// ✅ 正确 - 测试文件与被测文件同名，添加后缀（kebab-case + 类型后缀）
job.aggregate.ts              → job.aggregate.spec.ts
job-id.vo.ts                  → job-id.vo.spec.ts
create-job.handler.ts         → create-job.handler.spec.ts
postgres-job.repository.ts    → postgres-job.repository.int-spec.ts

// ❌ 错误 - 不符合规范
Job.ts                        → Job.spec.ts
create-job-handler.ts         → test-create-job.ts
job.ts                        → job-test.ts
```

### 1.3 测试文件位置

测试文件应与被测文件**同目录放置**：

```
src/
├── domain/
│   ├── aggregates/
│   │   ├── job.aggregate.ts
│   │   └── job.aggregate.spec.ts              ✅ 单元测试（同目录）
│   ├── value-objects/
│   │   ├── money.vo.ts
│   │   └── money.vo.spec.ts                   ✅ 单元测试（同目录）
│   └── entities/
│       ├── job-item.entity.ts
│       └── job-item.entity.spec.ts            ✅ 单元测试（同目录）
├── application/
│   └── commands/
│       ├── create-job.command.ts
│       ├── create-job.command.spec.ts         ✅ 单元测试
│       └── handlers/
│           ├── create-job.handler.ts
│           └── create-job.handler.spec.ts     ✅ 单元测试
└── infrastructure/
    └── persistence/
        ├── postgres-job.repository.ts
        └── postgres-job.repository.int-spec.ts  ✅ 集成测试
```

---

## 二、测试套件命名

### 2.1 describe 命名规范

```typescript
// ✅ 正确 - 使用被测类/模块名称
describe('Job', () => {});
describe('Money', () => {});
describe('CreateJobHandler', () => {});
describe('PostgresJobRepository', () => {});

// ✅ 正确 - 使用业务概念（中文）
describe('任务', () => {});
describe('金额', () => {});
describe('创建任务处理器', () => {});
describe('任务仓储', () => {});

// ❌ 错误 - 模糊的命名
describe('Test', () => {});
describe('JobTest', () => {});
describe('测试', () => {});
```

### 2.2 嵌套 describe 命名

```typescript
// ✅ 正确 - 分层组织测试用例
describe('Job', () => {
  describe('创建任务', () => {
    it('应该成功创建草稿任务', () => {});
    it('应该在创建时触发 JobCreatedEvent', () => {});
  });

  describe('添加任务项', () => {
    it('应该成功添加任务项到草稿任务', () => {});
    it('不能向已提交的任务添加任务项', () => {});
    it('应该合并相同任务项的预算', () => {});
  });

  describe('提交任务', () => {
    it('应该成功提交包含任务项的任务', () => {});
    it('不能提交空任务', () => {});
    it('提交时应该触发 JobSubmittedEvent', () => {});
  });
});

// ✅ 正确 - 按方法组织
describe('Job', () => {
  describe('create', () => {
    it('should create job with valid props', () => {});
    it('should fail when customerId is empty', () => {});
  });

  describe('addTask', () => {
    it('should add task to draft job', () => {});
    it('should throw error when job is submitted', () => {});
  });

  describe('submit', () => {
    it('should submit job with tasks', () => {});
    it('should throw error when job is empty', () => {});
  });
});
```

---

## 三、测试用例命名

### 3.1 it 命名模式

#### 模式 1：英文命名（推荐用于技术团队）

```typescript
// ✅ 正确 - should + 预期行为 + when + 条件
it('should add task to draft job', () => {});
it('should throw error when job is submitted', () => {});
it('should calculate correct budget when multiple tasks exist', () => {});

// ✅ 正确 - should + 预期行为
it('should return zero for empty job', () => {});
it('should emit JobCreatedEvent', () => {});
it('should validate email format', () => {});

// ✅ 正确 - when + 条件 + should + 预期行为
it('when job is submitted should not allow modifications', () => {});
it('when customer is VIP should apply discount', () => {});
```

#### 模式 2：中文命名（推荐用于业务团队）

```typescript
// ✅ 正确 - 应该 + 预期行为 + 当/时 + 条件
it('应该成功添加任务到草稿任务', () => {});
it('当任务已提交时应该抛出异常', () => {});
it('当有多个任务项时应该正确计算总预算', () => {});

// ✅ 正确 - 应该 + 预期行为
it('应该返回0表示空任务', () => {});
it('应该触发 JobCreatedEvent', () => {});
it('应该验证邮箱格式', () => {});

// ✅ 正确 - 条件 + 应该 + 预期行为
it('当任务已提交时不允许修改', () => {});
it('当客户是VIP时应该应用折扣', () => {});
```

### 3.2 命名最佳实践

```typescript
// ✅ 好的命名 - 清晰描述预期行为
describe('Job', () => {
  describe('addTask', () => {
    it('should add task to draft job', () => {});
    it('should increase budget when task is added', () => {});
    it('should throw error when adding to submitted job', () => {});
    it('should merge budgets when same type task is added', () => {});
    it('should emit TaskAddedEvent', () => {});
    it('should reject zero budget', () => {});
    it('should reject negative budget', () => {});
  });

  describe('submit', () => {
    it('should change status to submitted when job has tasks', () => {});
    it('should set submittedAt timestamp', () => {});
    it('should throw error when job is empty', () => {});
    it('should throw error when job is already submitted', () => {});
    it('should emit JobSubmittedEvent', () => {});
  });
});

// ❌ 不好的命名 - 模糊、不具体
describe('Job', () => {
  it('test1', () => {});
  it('should work', () => {});
  it('addTask', () => {});
  it('test add task', () => {});
  it('happy path', () => {});
});
```

---

## 四、测试辅助文件命名

### 4.1 Fixture 文件

**命名模式**：`[业务概念].fixture.ts`

```typescript
// ✅ 正确
job.fixture.ts
customer.fixture.ts
task.fixture.ts
payment.fixture.ts

// 使用示例
export class JobFixture {
  static createDefault(): Job {
    return Job.create({
      customerId: 'customer-123',
      tenantId: 'tenant-456'
    }).value;
  }

  static createWithTasks(taskCount: number): Job {
    const job = this.createDefault();
    // ...
    return job;
  }
}
```

### 4.2 Mock 文件

**命名模式**：`[被Mock组件].mock.ts`

```typescript
// ✅ 正确
job.repository.mock.ts
event-bus.mock.ts
logger.mock.ts
payment-gateway.mock.ts

// 使用示例
export class MockJobRepository implements IJobRepository {
  private jobs: Map<string, Job> = new Map();

  async save(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }
}
```

### 4.3 Test Helper 文件

**命名模式**：`[用途]-helpers.ts` 或 `[用途]-utils.ts`

```typescript
// ✅ 正确
test-helpers.ts
database-helpers.ts
api-helpers.ts
mock-helpers.ts

// 使用示例
export const waitFor = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const createTestContainer = (): Container => {
  const container = new Container();
  // 配置测试容器
  return container;
};
```

### 4.4 Test Data 文件

**命名模式**：`test-data.ts` 或 `[用途]-test-data.ts`

```typescript
// ✅ 正确
test-data.ts
order-test-data.ts
customer-test-data.ts

// 使用示例
export const TEST_CUSTOMER = {
  id: 'customer-123',
  email: 'test@example.com',
  name: '测试用户'
};

export const TEST_PRODUCTS = [
  { id: 'product-1', name: 'Laptop', price: 1000 },
  { id: 'product-2', name: 'Mouse', price: 100 }
];
```

---

## 五、BDD 测试命名

### 5.1 Feature 文件命名

**命名模式**：`[业务功能].feature`

```gherkin
# ✅ 正确
job-management.feature
customer-registration.feature
payment-processing.feature
discount-calculation.feature

# ❌ 错误
test.feature
feature1.feature
job-test.feature
```

### 5.2 Scenario 命名

```gherkin
# ✅ 正确 - 清晰描述业务场景
Feature: 任务管理

  Scenario: 成功提交包含任务项的任务
    Given 任务清单中有2个任务项
    When 用户提交任务
    Then 任务状态应为"已提交"
    And 用户应收到确认邮件

  Scenario: 不能提交空任务
    Given 任务清单为空
    When 用户尝试提交任务
    Then 系统应提示"任务清单不能为空"

  Scenario: VIP会员享受10%折扣
    Given 用户是VIP会员
    And 任务清单中有1000元预算
    When 计算任务总预算
    Then 总预算应为900元

# ❌ 错误 - 模糊的命名
  Scenario: 测试1
  Scenario: 提交任务
  Scenario: happy path
```

---

## 六、命名约定对比

### 6.1 中英文命名选择

| 团队类型 | 推荐语言 | 原因 |
|:---|:---|:---|
| **纯技术团队** | 英文 | 与代码风格一致，便于技术交流 |
| **业务参与团队** | 中文 | 便于业务人员理解和参与 |
| **混合团队** | 混合 | describe用英文，it用中文或反之 |

### 6.2 混合命名示例

```typescript
// ✅ 技术团队风格 - 全英文
describe('Job', () => {
  describe('addTask', () => {
    it('should add task to draft job', () => {});
    it('should throw error when job is submitted', () => {});
  });
});

// ✅ 业务参与风格 - 全中文
describe('任务', () => {
  describe('添加任务项', () => {
    it('应该成功添加任务项到草稿任务', () => {});
    it('当任务已提交时应该抛出异常', () => {});
  });
});

// ✅ 混合风格 - describe英文，it中文
describe('Job', () => {
  describe('addTask', () => {
    it('应该成功添加任务项到草稿任务', () => {});
    it('当任务已提交时应该抛出异常', () => {});
  });
});
```

---

## 七、命名规范总结

### 7.1 文件命名清单

- ✅ 测试文件与被测文件同名
- ✅ 添加正确的测试类型后缀（`.spec.ts`、`.int-spec.ts`等）
- ✅ 测试文件与被测文件放在同一目录
- ✅ Fixture文件使用 `.fixture.ts` 后缀
- ✅ Mock文件使用 `.mock.ts` 后缀
- ✅ Helper文件使用 `-helpers.ts` 或 `-utils.ts` 后缀

### 7.2 测试套件命名清单

- ✅ describe使用被测类名或业务概念
- ✅ 嵌套describe按方法或业务场景分组
- ✅ describe命名清晰反映测试范围

### 7.3 测试用例命名清单

- ✅ 使用"should + 行为 + when + 条件"模式
- ✅ 或使用"应该 + 行为 + 当 + 条件"模式
- ✅ 避免使用"test1"、"should work"等模糊命名
- ✅ 命名应清晰表达预期行为和条件
- ✅ 从命名就能看出测试意图

### 7.4 BDD测试命名清单

- ✅ Feature文件使用业务功能命名
- ✅ Scenario清晰描述业务场景
- ✅ 避免技术术语，使用业务语言
- ✅ Scenario命名独立完整

---

[下一章：Mock与Stub指南 →](./07-mocking-guide.md)
