# 测试文件命名规范

[返回目录](./spec.md) | [上一章：共享模块](./spec-06-shared.md)

---

## 文件命名规范

| 测试类型 | 文件后缀 | 用途 | 示例 |
|:---|:---|:---|:---|
| 单元测试 | `.spec.ts` | 测试单个类/函数 | `job.aggregate.spec.ts` |
| 集成测试 | `.int-spec.ts` | 测试多个组件协作 | `postgres-job.repository.int-spec.ts` |
| 端到端测试 | `.e2e-spec.ts` | 测试完整业务流程 | `job-flow.e2e-spec.ts` |
| 性能测试 | `.perf-spec.ts` | 性能基准测试 | `job-throughput.perf-spec.ts` |
| 测试夹具 | `.fixture.ts` | 测试数据工厂 | `job.fixture.ts` |
| Mock 文件 | `.mock.ts` | Mock 实现 | `job.repository.mock.ts` |
| 测试辅助 | `.test-utils.ts` | 测试工具函数 | `test-utils.test-utils.ts` |

---

## 一、测试文件位置

测试文件应与被测文件**同目录放置**，便于维护和查找：

```
packages/domains-job/src/
├── domain/
│   ├── aggregates/
│   │   ├── job.aggregate.ts
│   │   └── job.aggregate.spec.ts          ← 单元测试（同目录）
│   ├── value-objects/
│   │   ├── job-id.vo.ts
│   │   └── job-id.vo.spec.ts              ← 单元测试（同目录）
│   └── entities/
│       ├── job-item.entity.ts
│       └── job-item.entity.spec.ts        ← 单元测试（同目录）
├── application/
│   └── commands/
│       ├── create-job.command.ts
│       ├── create-job.command.spec.ts
│       └── handlers/
│           ├── create-job.handler.ts
│           └── create-job.handler.spec.ts
└── infrastructure/
    └── persistence/
        ├── postgres-job.repository.ts
        └── postgres-job.repository.int-spec.ts  ← 集成测试
```

---

## 二、测试文件命名

```typescript
// ✅ 正确 - 单元测试
job.aggregate.spec.ts           // 聚合根测试
job-id.vo.spec.ts               // 值对象测试
create-job.handler.spec.ts      // 命令处理器测试

// ✅ 正确 - 集成测试
postgres-job.repository.int-spec.ts      // 仓储集成测试
kafka-event-bus.adapter.int-spec.ts      // 事件总线集成测试
job.controller.int-spec.ts               // 控制器集成测试

// ✅ 正确 - 端到端测试
job-flow.e2e-spec.ts                     // 任务流程 E2E 测试
payment-flow.e2e-spec.ts                 // 支付流程 E2E 测试

// ❌ 错误
job.test.ts                    // 应使用 .spec.ts
JobAggregate.spec.ts           // 应使用 kebab-case
job_spec.ts                    // 应使用点号分隔
```

**命名模式**：`[被测文件名].[测试类型后缀]`

---

## 三、测试夹具（Fixture）

```typescript
// ✅ 正确 - 夹具文件命名
// 文件名: job.fixture.ts
export class JobFixture { }
// 文件名: test-data.fixture.ts
export class TestDataFixture { }
// 文件名: database.fixture.ts
export class DatabaseFixture { }

// ❌ 错误
jobFixture.ts                   // 应使用点号分隔
job-fixture.ts                  // 应与被测文件名匹配
```

### 3.1 测试夹具最佳实践

```typescript
// ✅ 正确 - 文件名: job.fixture.ts
/**
 * 任务测试夹具
 * 
 * @business-rule 提供各种测试场景的任务实例
 */
export class JobFixture {
  /**
   * 创建默认任务
   */
  static createDefault(overrides?: Partial<JobProps>): Job {
    return Job.create({
      customerId: 'customer-123',
      tenantId: 'tenant-123',
      title: '测试任务',
      items: [],
      ...overrides
    }).value;
  }

  /**
   * 创建包含指定数量工作项的任务
   */
  static createWithItems(itemCount: number): Job {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      productId: `product-${i}`,
      quantity: 1,
      unitPrice: Money.from(100, 'CNY')
    }));

    return this.createDefault({ items });
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
   * 创建已完成的任务
   */
  static createCompletedJob(): Job {
    const job = this.createSubmittedJob();
    job.complete();
    return job;
  }

  /**
   * 创建默认请求 DTO
   */
  static createDefaultRequestDto(): CreateJobRequestDto {
    return {
      customerId: 'customer-123',
      title: '测试任务',
      items: [
        { productId: 'product-1', quantity: 1, unitPrice: 100 }
      ]
    };
  }
}
```

**命名模式**：
- 文件：`[业务概念].fixture.ts`
- 类：`[业务概念]Fixture`

---

## 四、测试辅助文件

```typescript
// ✅ 正确 - 测试辅助文件命名
// 文件名: test-utils.test-utils.ts
export const waitFor = ...;
// 文件名: mock-helpers.test-utils.ts
export const createMockLogger = ...;
// 文件名: database-helpers.test-utils.ts
export const setupTestDatabase = ...;
```

### 4.1 测试辅助文件最佳实践

```typescript
// ✅ 正确 - 文件名: test-utils.test-utils.ts
/**
 * 测试工具函数
 */
export const waitFor = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * 创建 Mock 日志器
 */
export const createMockLogger = (): ILogger => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
});

/**
 * 创建测试依赖注入容器
 */
export const createTestContainer = (): Container => {
  const container = new Container();
  container.bind(ILogger).toConstantValue(createMockLogger());
  return container;
};

// 文件名: mock-helpers.test-utils.ts
/**
 * Mock 仓储工厂
 */
export const mockRepository = <T extends IRepository>(): jest.Mocked<T> => ({
  save: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn()
} as unknown as jest.Mocked<T>);

/**
 * Mock 事件总线
 */
export const mockEventBus = (): jest.Mocked<IEventBus> => ({
  publish: jest.fn(),
  publishAll: jest.fn(),
  subscribe: jest.fn()
});
```

**命名模式**：
- 文件：`[用途].test-utils.ts` 或 `[用途]-helpers.test-utils.ts`

---

## 五、Mock 文件

```typescript
// ✅ 正确 - Mock 文件命名
// 文件名: job.repository.mock.ts
export class MockJobRepository implements IJobRepository { }
// 文件名: event-bus.mock.ts
export class MockEventBus implements IEventBus { }
// 文件名: logger.mock.ts
export class MockLogger implements ILogger { }
```

### 5.1 Mock 文件最佳实践

```typescript
// ✅ 正确 - 文件名: job.repository.mock.ts
/**
 * Mock 任务仓储
 * 
 * @business-rule 使用内存存储模拟仓储行为
 */
export class MockJobRepository implements IJobRepository {
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

  // 测试辅助方法
  clear(): void {
    this.jobs.clear();
  }

  getAll(): Job[] {
    return Array.from(this.jobs.values());
  }

  has(id: string): boolean {
    return this.jobs.has(id);
  }

  count(): number {
    return this.jobs.size;
  }
}
```

**命名模式**：
- 文件：`[被Mock组件].mock.ts`
- 类：`Mock[组件名]`

---

## 六、测试套件命名

```typescript
// ✅ 正确 - describe 命名
describe('Job', () => {                    // 被测类名
  describe('addItem', () => {              // 被测方法名
    it('should add item to job', () => {   // 期望行为
      // ...
    });
  });
});

// ✅ 正确 - 使用中文描述业务场景
describe('Job 聚合根', () => {
  describe('添加工作项', () => {
    it('应该成功添加工作项到任务', () => {
      // ...
    });

    it('当任务已提交时应该抛出异常', () => {
      // ...
    });

    it('当工作项数量超过限制时应该抛出异常', () => {
      // ...
    });
  });

  describe('提交任务', () => {
    it('应该成功提交包含工作项的任务', () => {
      // ...
    });

    it('当任务没有工作项时应该抛出异常', () => {
      // ...
    });
  });
});
```

---

## 七、测试文件结构

```typescript
// ✅ 正确 - 标准测试文件结构
// 文件名: job.aggregate.spec.ts
import { Job } from './job.aggregate';
import { JobFixture } from './job.fixture';

describe('Job 聚合根', () => {
  let fixture: JobFixture;

  beforeEach(() => {
    fixture = new JobFixture();
  });

  describe('create', () => {
    it('应该成功创建任务', () => {
      // Arrange
      const props = fixture.createDefaultProps();

      // Act
      const result = Job.create(props);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.customerId).toBe(props.customerId);
    });

    it('当 customerId 为空时应该失败', () => {
      // Arrange
      const props = fixture.createDefaultProps({ customerId: '' });

      // Act
      const result = Job.create(props);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('customerId');
    });
  });

  describe('addItem', () => {
    it('应该成功添加工作项到草稿任务', () => {
      // Arrange
      const job = fixture.createDefault();
      const item = fixture.createDefaultItem();

      // Act
      job.addItem(item);

      // Assert
      expect(job.items.length).toBe(1);
    });

    it('当任务已提交时应该抛出异常', () => {
      // Arrange
      const job = fixture.createSubmittedJob();
      const item = fixture.createDefaultItem();

      // Act & Assert
      expect(() => job.addItem(item)).toThrow(JobDomainException);
    });
  });
});
```

---

## 八、集成测试目录

对于需要外部资源的集成测试，可以单独放在 `tests/integration/` 目录：

```
packages/domains-job/
├── src/
│   └── (源代码和单元测试)
├── tests/
│   ├── integration/
│   │   ├── infrastructure/
│   │   │   ├── postgres-job.repository.int-spec.ts
│   │   │   └── kafka-event-bus.adapter.int-spec.ts
│   │   └── api/
│   │       └── job.controller.int-spec.ts
│   └── e2e/
│       ├── job-flow.e2e-spec.ts
│       └── payment-flow.e2e-spec.ts
```

---

## 九、测试配置文件

```typescript
// ✅ 正确 - 测试配置文件命名
// 文件名: jest.config.js 或 jest.config.ts
// 文件名: jest.setup.ts
// 文件名: test-containers.config.ts

// 文件名: jest.setup.ts
/**
 * Jest 测试环境设置
 */
import { MockDate } from './mock-date.test-utils';

// 固定时间便于测试
beforeAll(() => {
  MockDate.freeze('2024-01-01T00:00:00.000Z');
});

afterAll(() => {
  MockDate.restore();
});

// 每个测试后清理
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## 目录结构示例

```
packages/domains-job/
├── src/
│   ├── domain/
│   │   ├── aggregates/
│   │   │   ├── job.aggregate.ts
│   │   │   └── job.aggregate.spec.ts
│   │   ├── value-objects/
│   │   │   ├── job-id.vo.ts
│   │   │   └── job-id.vo.spec.ts
│   │   └── fixtures/
│   │       └── job.fixture.ts
│   ├── application/
│   │   └── commands/
│   │       ├── handlers/
│   │       │   ├── create-job.handler.ts
│   │       │   └── create-job.handler.spec.ts
│   │       └── mocks/
│   │           └── job.repository.mock.ts
│   └── infrastructure/
│       └── persistence/
│           ├── postgres-job.repository.ts
│           └── postgres-job.repository.int-spec.ts
├── tests/
│   ├── integration/
│   │   └── job-flow.int-spec.ts
│   ├── e2e/
│   │   └── job-flow.e2e-spec.ts
│   └── utils/
│       ├── test-utils.test-utils.ts
│       └── mock-helpers.test-utils.ts
└── jest.config.ts
```

---

[下一章：变量命名规范 →](./spec-08-variables.md)
