# BDD 测试

[返回目录](./README.md) | [上一章：单元测试](./02-unit-testing.md)

---

## 一、BDD 核心理念

### 1.1 什么是 BDD？

BDD（Behavior Driven Development，行为驱动开发）是一种**设计方法**，通过自然语言描述系统行为，促进业务人员、测试人员和开发人员之间的沟通。

### 1.2 BDD 的核心要素

```gherkin
Feature: 任务提交
  As a 客户
  I want 提交任务
  So that 我可以完成工作

  Scenario: 成功提交有效任务
    Given 一个包含工作项的草稿任务
      And 任务总金额为100元
    When 客户提交任务
    Then 任务状态变为"已提交"
      And 任务不可再修改
      And 触发"任务已提交"事件
```

### 1.3 Given-When-Then 结构

| 关键字 | 含义 | 对应 |
|:---|:---|:---|
| **Given** | 前置条件 | 准备测试数据和环境 |
| **When** | 执行动作 | 触发被测行为 |
| **Then** | 预期结果 | 验证行为结果 |

---

## 二、BDD 的两种形式

### 2.1 业务层 BDD（Gherkin 语言）

使用 Cucumber.js 等框架，业务人员可读：

```gherkin
# features/job.feature
Feature: 任务管理
  As a 客户
  I want 能够提交任务
  So that 我可以完成工作

  Background:
    Given 用户"张三"已登录
    And 工作清单中有以下任务
      | 任务名称   | 数量 | 单价 |
      | 开发功能   | 1   | 5000 |
      | 测试功能   | 2   | 200  |

  Scenario: 成功提交有效任务
    When 用户提交任务
    Then 任务创建成功
    And 任务总金额应为 5400 元
    And 任务状态应为"已提交"
    And 用户应收到确认邮件

  Scenario: 不能提交空任务
    Given 工作清单为空
    When 用户尝试提交任务
    Then 系统应提示"工作清单不能为空"
    And 任务不应被创建
```

### 2.2 代码层 BDD（describe-it 风格）

使用 Jest 的 BDD 风格编写：

```typescript
// 文件: job.aggregate.spec.ts
describe('Job', () => {
  let job: Job;
  let task: Task;

  beforeEach(() => {
    task = new Task('开发功能', 5000);
    job = Job.create('customer-123');
  });

  describe('when adding items to job', () => {
    context('and the job is in draft status', () => {
      it('should successfully add the item', () => {
        job.addItem(task, 1);

        expect(job.items).toHaveLength(1);
        expect(job.total).toBe(5000);
      });

      it('should calculate correct total for multiple items', () => {
        job.addItem(task, 2);
        job.addItem(new Task('测试功能', 200), 1);

        expect(job.total).toBe(10200);
      });
    });

    context('and the job is already submitted', () => {
      beforeEach(() => {
        job.addItem(task, 1);
        job.submit();
      });

      it('should throw an error when trying to add items', () => {
        expect(() => {
          job.addItem(new Task('部署功能', 300), 1);
        }).toThrow('不能修改已提交的任务');
      });
    });
  });

  describe('when submitting job', () => {
    context('and job has items', () => {
      beforeEach(() => {
        job.addItem(task, 1);
      });

      it('should change status to submitted', () => {
        job.submit();

        expect(job.status).toBe('submitted');
        expect(job.submittedAt).toBeDefined();
      });
    });

    context('and job is empty', () => {
      it('should throw an error', () => {
        expect(() => job.submit()).toThrow('不能提交空任务');
      });
    });
  });
});
```

---

## 三、Gherkin 语法详解

### 3.1 Feature（功能）

描述一个完整的业务功能：

```gherkin
Feature: 功能名称
  As a 角色
  I want 功能
  So that 业务价值
```

### 3.2 Scenario（场景）

描述一个具体的使用场景：

```gherkin
Scenario: 场景名称
  Given 前置条件
  When 执行动作
  Then 预期结果
```

### 3.3 Background（背景）

多个场景共享的前置条件：

```gherkin
Feature: 任务管理

  Background:
    Given 用户已登录
    And 任务库存充足

  Scenario: 场景1
    # 自动包含 Background 中的条件

  Scenario: 场景2
    # 自动包含 Background 中的条件
```

### 3.4 数据表格

用于传递复杂数据：

```gherkin
Scenario: 批量添加任务
  When 用户添加以下任务到工作清单
    | 任务名称 | 数量 | 单价 |
    | 开发功能 | 1    | 5000 |
    | 测试功能 | 2    | 200  |
  Then 工作清单总金额应为 5400 元
```

### 3.5 参数化场景

使用 Scenario Outline 实现数据驱动：

```gherkin
Scenario Outline: 计算折扣价格
  Given 用户等级为"<会员等级>"
  And 任务原价为<原价>元
  When 计算折扣价格
  Then 折扣后价格应为<折后价>元

  Examples:
    | 会员等级 | 原价 | 折后价 |
    | 普通会员 | 100  | 100    |
    | 高级会员 | 100  | 90     |
    | VIP会员  | 100  | 80     |
```

---

## 四、步骤定义（Step Definitions）

### 4.1 基本步骤定义

```typescript
// 文件: features/step-definitions/job.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './test-context';

// 共享上下文
let context: TestContext;

Given('用户"{string}"已登录', async function (email: string) {
  context = new TestContext();
  await context.login(email);
});

Given('工作清单中有以下任务', async function (dataTable) {
  const items = dataTable.hashes();
  for (const item of items) {
    await context.addToJob(item['任务名称'], parseInt(item['数量']));
  }
});

When('用户提交任务', async function () {
  context.result = await context.submitJob();
});

Then('任务创建成功', function () {
  expect(context.result.success).to.be.true;
  expect(context.result.job).to.exist;
});

Then('任务总金额应为 {int} 元', function (expectedTotal: number) {
  expect(context.result.job.total).to.equal(expectedTotal);
});

Then('任务状态应为"{string}"', function (expectedStatus: string) {
  expect(context.result.job.status).to.equal(expectedStatus);
});
```

### 4.2 测试上下文

```typescript
// 文件: test-context.ts
export class TestContext {
  private user: User | null = null;
  private job: Job = new Job();
  private jobService: JobService;
  
  job: Job | null = null;
  result: any = null;

  constructor() {
    this.jobService = new JobService(
      new MockJobRepository(),
      new MockEventBus()
    );
  }

  async login(email: string): Promise<void> {
    this.user = await this.jobService.findOrCreateUser(email);
  }

  async addToJob(taskName: string, quantity: number): Promise<void> {
    const task = await this.jobService.findTask(taskName);
    this.job.addItem(task, quantity);
  }

  async submitJob(): Promise<any> {
    if (!this.user) {
      throw new Error('用户未登录');
    }
    return this.jobService.createJob(this.user.id, this.job);
  }
}
```

---

## 五、BDD 测试最佳实践

### 5.1 场景命名规范

```gherkin
# ✅ 好的命名
Scenario: 成功提交包含工作项的任务
Scenario: 提交空任务时显示错误提示
Scenario: VIP会员享受额外折扣

# ❌ 不好的命名
Scenario: 测试1
Scenario: 提交任务
Scenario: happy path
```

### 5.2 场景独立性

```gherkin
# ✅ 每个场景独立
Scenario: 场景1
  Given 用户已登录
  And 工作清单中有任务
  When 提交任务
  Then 任务创建成功

Scenario: 场景2
  Given 用户已登录
  And 工作清单为空
  When 提交任务
  Then 显示错误

# ❌ 场景依赖（场景2依赖场景1的状态）
```

### 5.3 使用声明式语言

```gherkin
# ✅ 声明式：描述"是什么"
Then 任务创建成功
And 用户收到确认邮件

# ❌ 命令式：描述"怎么做"
Then 系统调用任务服务创建任务
And 系统发送邮件服务发送邮件
```

---

## 六、BDD 与 TDD 的结合

### 6.1 双循环开发流程

```
┌─────────────────────────────────────────┐
│           外层循环：BDD                   │
│  1. 编写/更新 Feature 文件               │
│  2. 运行 BDD 测试（失败）                 │
│  3. 编写步骤定义（存根）                  │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │       内层循环：TDD                 │ │
│  │  1. 编写单元测试（失败）            │ │
│  │  2. 实现代码（通过）                │ │
│  │  3. 重构                           │ │
│  │  4. 重复直到步骤实现完成            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  4. BDD 测试通过                        │
│  5. 下一个场景                          │
└─────────────────────────────────────────┘
```

### 6.2 实际开发流程示例

```gherkin
# Step 1: 产品经理编写 BDD 场景
Feature: 会员折扣
  Scenario: 高级会员享受10%折扣
    Given 用户是高级会员
    When 用户购买1000元任务
    Then 只需支付900元
```

```typescript
// 文件: money.vo.spec.ts
// Step 2: 运行 BDD 测试（失败）
// 输出：Undefined. Implement with the following snippet...

// Step 3: TDD 方式实现
describe('Member Discount', () => {
  it('should apply 10% discount for premium members', () => {
    const member = new Member('premium');
    const job = new Job(member);
    job.addItem(task, 1000);

    expect(job.total).toBe(900);
  });
});

// Step 4: 实现功能
export class Job {
  calculateTotal(): number {
    let total = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    if (this.member.isPremium) {
      total *= 0.9;
    }
    return total;
  }
}

// Step 5: 实现步骤定义
Then('只需支付{int}元', function (expectedAmount: number) {
  expect(this.job.total).toBe(expectedAmount);
});

// Step 6: BDD 测试通过 ✅
```

---

## 七、文件命名规范

| 文件类型 | 命名模式 | 示例 |
|:---|:---|:---|
| **Feature 文件** | `[业务功能].feature` | `job-management.feature` |
| **步骤定义** | `[功能].steps.ts` | `job.steps.ts` |
| **测试上下文** | `test-context.ts` | `test-context.ts` |

---

[下一章：TDD 方法论 →](./04-tdd-methodology.md)
