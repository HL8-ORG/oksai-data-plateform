# TDD 方法论

[返回目录](./README.md) | [上一章：BDD测试](./03-bdd-testing.md)

---

## 一、什么是 TDD？

TDD（Test-Driven Development，测试驱动开发）是一种**开发方法论**，核心思想是**在编写实现代码之前先编写测试**。

### 1.1 TDD 的价值

| 价值 | 说明 |
|:---|:---|
| **设计指导** | 测试先行帮助设计更好的接口 |
| **快速反馈** | 即时知道代码是否正确 |
| **安全重构** | 测试覆盖让重构更安全 |
| **活文档** | 测试即文档，描述代码行为 |
| **减少调试** | 问题在小范围内被发现 |

---

## 二、红-绿-重构循环

### 2.1 循环流程

```
┌─────────────────────────────────────────┐
│                                         │
│     🔴 红 (Red)                         │
│     编写一个失败的测试                   │
│            │                            │
│            ▼                            │
│     🟢 绿 (Green)                       │
│     用最简单的方式让测试通过             │
│            │                            │
│            ▼                            │
│     🔵 重构 (Refactor)                  │
│     优化代码，保持测试通过               │
│            │                            │
│            └──────────────────────────┐ │
│                                         │ │
└─────────────────────────────────────────┘ │
                                            │
              ┌─────────────────────────────┘
              ▼
         下一轮循环
```

### 2.2 代码示例

```typescript
// ==================== 第一轮循环 ====================

// 🔴 第一步：写一个失败的测试
describe('Calculator', () => {
  it('should add two numbers', () => {
    const calc = new Calculator();
    const result = calc.add(2, 3);
    expect(result).toBe(5);
  });
});
// 运行测试：❌ Calculator is not defined

// 🟢 第二步：用最简单的方式让测试通过
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
// 运行测试：✅ 通过

// 🔵 第三步：重构（此时代码已经很简洁，无需重构）

// ==================== 第二轮循环 ====================

// 🔴 第一步：写一个失败的测试
it('should subtract two numbers', () => {
  const calc = new Calculator();
  const result = calc.subtract(5, 3);
  expect(result).toBe(2);
});
// 运行测试：❌ calc.subtract is not a function

// 🟢 第二步：用最简单的方式让测试通过
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}
// 运行测试：✅ 通过

// 🔵 第三步：重构
export class Calculator {
  // 添加参数验证
  private validateInputs(...args: number[]): void {
    args.forEach(arg => {
      if (typeof arg !== 'number' || isNaN(arg)) {
        throw new Error('所有参数必须是有效数字');
      }
    });
  }

  add(a: number, b: number): number {
    this.validateInputs(a, b);
    return a + b;
  }

  subtract(a: number, b: number): number {
    this.validateInputs(a, b);
    return a - b;
  }
}
// 运行测试：✅ 通过
```

---

## 三、TDD 开发值对象示例

### 3.1 完整的 TDD 流程

```typescript
// ==================== 阶段 1：创建基本结构 ====================

// 🔴 测试 1
describe('Money', () => {
  it('should create money with valid amount and currency', () => {
    const result = Money.create(100, 'USD');

    expect(result.isOk()).toBe(true);
    expect(result.value.amount).toBe(100);
    expect(result.value.currency).toBe('USD');
  });
});

// 🟢 实现 1
export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string
  ) {}

  static create(amount: number, currency: string): Result<Money, ValidationError> {
    return Result.ok(new Money(amount, currency));
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }
}

// ==================== 阶段 2：添加验证 ====================

// 🔴 测试 2
it('should fail when amount is negative', () => {
  const result = Money.create(-100, 'USD');

  expect(result.isFail()).toBe(true);
  expect(result.value.message).toContain('金额不能为负数');
});

// 🟢 实现 2
static create(amount: number, currency: string): Result<Money, ValidationError> {
  if (amount < 0) {
    return Result.fail(new ValidationError('金额不能为负数', 'amount', amount));
  }
  return Result.ok(new Money(amount, currency));
}

// 🔴 测试 3
it('should fail when currency is not 3 characters', () => {
  const result = Money.create(100, 'US');

  expect(result.isFail()).toBe(true);
  expect(result.value.message).toContain('货币代码必须为3个字符');
});

// 🟢 实现 3
static create(amount: number, currency: string): Result<Money, ValidationError> {
  if (amount < 0) {
    return Result.fail(new ValidationError('金额不能为负数', 'amount', amount));
  }
  if (!currency || currency.length !== 3) {
    return Result.fail(new ValidationError('货币代码必须为3个字符', 'currency', currency));
  }
  return Result.ok(new Money(amount, currency.toUpperCase()));
}

// ==================== 阶段 3：添加行为 ====================

// 🔴 测试 4
it('should add two money objects with same currency', () => {
  const money1 = Money.fromPersistence({ amount: 100, currency: 'USD' });
  const money2 = Money.fromPersistence({ amount: 50, currency: 'USD' });

  const result = money1.add(money2);

  expect(result.amount).toBe(150);
  expect(result.currency).toBe('USD');
});

// 🟢 实现 4
add(other: Money): Money {
  if (this._currency !== other._currency) {
    throw new Error('不能对不同货币进行运算');
  }
  return new Money(this._amount + other._amount, this._currency);
}

// 🔴 测试 5
it('should throw when adding different currencies', () => {
  const money1 = Money.fromPersistence({ amount: 100, currency: 'USD' });
  const money2 = Money.fromPersistence({ amount: 50, currency: 'EUR' });

  expect(() => money1.add(money2)).toThrow('不能对不同货币进行运算');
});

// 🟢 实现 5（已经在实现 4 中完成）

// 🔵 重构：提取验证逻辑
export class Money extends ValueObject<{ amount: number; currency: string }> {
  private constructor(props: { amount: number; currency: string }) {
    super(props);
  }

  static create(amount: number, currency: string): Result<Money, ValidationError> {
    const errors: ValidationError[] = [];

    if (amount < 0) {
      errors.push(new ValidationError('金额不能为负数', 'amount', amount));
    }

    if (!currency || currency.length !== 3) {
      errors.push(new ValidationError('货币代码必须为3个字符', 'currency', currency));
    }

    if (errors.length > 0) {
      return Result.fail(errors[0]); // 返回第一个错误
    }

    return Result.ok(new Money({
      amount: Math.round(amount * 100) / 100, // 保留两位小数
      currency: currency.toUpperCase()
    }));
  }

  static fromPersistence(data: { amount: number; currency: string }): Money {
    return new Money(data);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money({
      amount: this.props.amount + other.props.amount,
      currency: this.props.currency
    });
  }

  private ensureSameCurrency(other: Money): void {
    if (this.props.currency !== other.props.currency) {
      throw new Error('不能对不同货币进行运算');
    }
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }
}
```

---

## 四、TDD 核心原则

### 4.1 三条黄金法则

1. **测试先行**：在写实现代码之前先写测试
2. **最小实现**：只写刚好让测试通过的代码
3. **持续重构**：测试通过后优化代码质量

### 4.2 常见误区

| 误区 | 正确理解 |
|:---|:---|
| TDD 就是写单元测试 | TDD 是设计技术，单元测试是副产品 |
| 测试必须全部通过才能提交 | 红灯时也可以提交（WIP） |
| 每次只能写一个测试 | 可以先写多个失败测试，再逐个实现 |
| 必须严格遵循红绿重构 | 根据情况灵活调整 |

### 4.3 何时可以跳过 TDD？

| 场景 | 建议 |
|:---|:---|
| 探索性代码/原型 | 可以跳过 |
| 简单的 CRUD | 可以后补测试 |
| 核心业务逻辑 | **必须使用 TDD** |
| 领域模型 | **必须使用 TDD** |

---

## 五、TDD 与 BDD 的配合

### 5.1 双循环开发

```
外层循环：BDD
├── Feature: 会员折扣
│   └── Scenario: 高级会员享受10%折扣
│       ├── Given 用户是高级会员
│       ├── When 用户购买1000元商品
│       └── Then 只需支付900元
│
└── 内层循环：TDD
    ├── 🔴 写测试：会员折扣计算
    ├── 🟢 实现：折扣逻辑
    └── 🔵 重构：优化代码
```

### 5.2 实际工作流

```typescript
// Step 1: BDD 场景定义
// features/discount.feature
Scenario: 高级会员享受折扣
  Given 用户是高级会员
  When 用户购买1000元商品
  Then 只需支付900元

// Step 2: TDD 实现内层逻辑
describe('Job Budget Discount', () => {
  // 🔴 红灯
  it('should apply 10% discount for premium members', () => {
    const member = Member.create({ level: 'premium' });
    const job = Job.create(member);
    job.addTask(task, 1000);

    expect(job.budget).toBe(900); // ❌ 失败
  });

  // 🟢 绿灯
  calculateBudget(): number {
    let budget = this.tasks.reduce((sum, task) => sum + task.cost, 0);
    if (this.member.level === 'premium') {
      budget *= 0.9;
    }
    return budget;
  }
  // ✅ 通过

  // 🔵 重构
  private applyMemberDiscount(budget: number): number {
    const discountRate = this.member.discountRate;
    return budget * (1 - discountRate);
  }
  // ✅ 仍然通过
});

// Step 3: 实现 BDD 步骤定义
Then('只需支付{int}元', function (expectedAmount: number) {
  expect(this.job.budget).toBe(expectedAmount);
});

// Step 4: BDD 测试通过 ✅
```

---

## 六、TDD 最佳实践

### 6.1 测试命名

```typescript
// ✅ 好的命名
it('should return zero when job has no tasks', () => {});
it('should throw error when submitting empty job', () => {});
it('should apply 10% discount for premium members', () => {});

// ❌ 不好的命名
it('test1', () => {});
it('should work', () => {});
it('job', () => {});
```

### 6.2 测试粒度

```typescript
// ✅ 测试一个行为
it('should calculate correct budget', () => {
  job.addTask(task, 2);
  expect(job.budget).toBe(200);
});

// ❌ 测试多个行为
it('should add task and update budget and emit event', () => {
  job.addTask(task, 2);
  expect(job.tasks).toHaveLength(1);
  expect(job.budget).toBe(200);
  expect(job.domainEvents).toHaveLength(1);
});
```

### 6.3 保持测试简单

```typescript
// ✅ 简单直接
it('should add two numbers', () => {
  const result = calculator.add(2, 3);
  expect(result).toBe(5);
});

// ❌ 过度复杂
it('should add two numbers', () => {
  const numbers = [2, 3];
  const operations = ['add'];
  const context = new CalculatorContext(numbers, operations);
  const strategy = new CalculationStrategy(context);
  const result = strategy.execute();
  expect(result.value).toBe(5);
});
```

### 6.4 测试文件命名规范

```typescript
// ✅ 符合项目规范的文件命名
// job.aggregate.ts → job.aggregate.spec.ts
// job-id.vo.ts → job-id.vo.spec.ts
// create-job.command.ts → create-job.command.spec.ts
// create-job.handler.ts → create-job.handler.spec.ts
// postgres-job.repository.ts → postgres-job.repository.spec.ts

// ❌ 不符合规范的命名
// Job.spec.ts
// job-spec.ts
// job.test.ts
```

---

[下一章：DDD架构中的测试 →](./05-testing-in-ddd.md)
