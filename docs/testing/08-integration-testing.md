# 集成测试

[返回目录](./README.md) | [上一章：Mock与Stub指南](./07-mocking-guide.md)

---

## 一、集成测试定义

### 1.1 什么是集成测试？

集成测试验证**多个组件协作**时的行为，重点测试组件间的**交互和集成点**。

### 1.2 集成测试 vs 单元测试

| 维度 | 单元测试 | 集成测试 |
|:---|:---|:---|
| **测试范围** | 单个类/函数 | 多个组件协作 |
| **依赖** | Mock 所有外部依赖 | 使用真实依赖（数据库、消息队列等） |
| **速度** | 毫秒级 | 秒级 |
| **数量** | 大量（70%） | 适中（20%） |
| **关注点** | 业务逻辑正确性 | 组件交互正确性 |

### 1.3 集成测试场景

| 场景 | 是否需要集成测试 |
|:---|:---|
| 仓储实现（数据库操作） | ✅ 需要 |
| 消息队列发布/消费 | ✅ 需要 |
| 外部API调用 | ✅ 需要 |
| 领域逻辑验证 | ❌ 使用单元测试 |
| 值对象创建 | ❌ 使用单元测试 |

---

## 二、测试容器（Testcontainers）

### 2.1 为什么使用测试容器？

测试容器提供**真实的依赖环境**（PostgreSQL、Redis、Kafka等），同时保持测试的**隔离性和可重复性**。

### 2.2 安装测试容器

```bash
# 安装 testcontainers
pnpm add -D testcontainers

# 安装特定数据库的模块
pnpm add -D @testcontainers/postgresql
pnpm add -D @testcontainers/redis
pnpm add -D @testcontainers/kafka
```

### 2.3 PostgreSQL 测试容器

```typescript
// test-helpers/database-container.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export class TestDatabase {
  private container: StartedTestContainer;
  private connection: Connection;

  /**
   * 创建测试数据库容器
   */
  static async create(): Promise<TestDatabase> {
    const container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();

    const testDb = new TestDatabase();
    testDb.container = container;
    
    // 初始化数据库连接
    await testDb.initializeConnection();
    
    return testDb;
  }

  /**
   * 初始化数据库连接
   */
  private async initializeConnection(): Promise<void> {
    const connectionString = `postgresql://${this.container.getUsername()}:${this.container.getPassword()}@${this.container.getHost()}:${this.container.getMappedPort(5432)}/${this.container.getDatabase()}`;

    this.connection = await createConnection({
      type: 'postgres',
      url: connectionString,
      entities: [/* 实体列表 */],
      synchronize: true, // 自动创建表结构
      dropSchema: true   // 每次测试前删除旧表
    });
  }

  /**
   * 清空所有表数据
   */
  async cleanup(): Promise<void> {
    const entities = this.connection.entityMetadatas;
    for (const entity of entities) {
      const repository = this.connection.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
  }

  /**
   * 获取数据库连接
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * 关闭容器
   */
  async close(): Promise<void> {
    await this.connection.close();
    await this.container.stop();
  }
}
```

### 2.4 使用测试容器

```typescript
// postgres-job.repository.int-spec.ts
import { PostgresJobRepository } from './postgres-job.repository';
import { TestDatabase } from '../../../../tests/helpers/test-database';
import { Job } from '../../domain/job.aggregate';

describe('PostgresJobRepository', () => {
  let repository: PostgresJobRepository;
  let testDb: TestDatabase;

  beforeAll(async () => {
    // 启动测试容器
    testDb = await TestDatabase.create();
    
    // 创建仓储实例
    repository = new PostgresJobRepository(testDb.getConnection());
  }, 60000); // 增加超时时间，容器启动较慢

  afterAll(async () => {
    // 关闭容器
    await testDb.close();
  });

  beforeEach(async () => {
    // 每个测试前清空数据
    await testDb.cleanup();
  });

  describe('save', () => {
    it('应该成功保存任务', async () => {
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
      job.addTask(new Task('t1', '开发任务', Money.of(1000)), 1);
      await repository.save(job);

      // Assert
      const found = await repository.findById(job.id);
      expect(found?.tasks).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('任务不存在时应该返回null', async () => {
      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('应该正确映射领域对象', async () => {
      // Arrange
      const job = JobFixture.createWithTasks(2);
      await repository.save(job);

      // Act
      const found = await repository.findById(job.id);

      // Assert
      expect(found).toBeInstanceOf(Job);
      expect(found?.tasks).toHaveLength(2);
    });
  });
});
```

---

## 三、数据库集成测试

### 3.1 测试仓储实现

```typescript
// postgres-job.repository.int-spec.ts
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

  describe('CRUD 操作', () => {
    it('应该成功保存任务', async () => {
      // Arrange
      const job = JobFixture.createDefault();

      // Act
      await repository.save(job);

      // Assert
      const found = await repository.findById(job.id);
      expect(found).not.toBeNull();
    });

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

  describe('查询操作', () => {
    it('应该根据客户ID查询任务', async () => {
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
    });

    it('应该根据状态查询任务', async () => {
      // Arrange
      const draftJob = JobFixture.createDefault();
      const submittedJob = JobFixture.createSubmittedJob();

      await repository.save(draftJob);
      await repository.save(submittedJob);

      // Act
      const result = await repository.findByStatus('submitted');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(submittedJob.id);
    });
  });

  describe('并发处理', () => {
    it('应该处理并发更新（乐观锁）', async () => {
      // Arrange
      const job = JobFixture.createDefault();
      await repository.save(job);

      // Act - 并发更新
      const job1 = await repository.findById(job.id);
      const job2 = await repository.findById(job.id);

      job1?.addTask(new Task('t1', '开发任务', Money.of(1000)), 1);
      job2?.addTask(new Task('t2', '测试任务', Money.of(100)), 1);

      const result1 = await repository.save(job1!);
      const result2 = await repository.save(job2!);

      // Assert - 其中一个应该失败
      expect(result1.isOk() || result2.isOk()).toBe(true);
    });
  });

  describe('事务处理', () => {
    it('应该在事务中保存任务和任务项', async () => {
      // Arrange
      const job = JobFixture.createWithTasks(3);

      // Act
      await repository.save(job);

      // Assert
      const found = await repository.findById(job.id);
      expect(found?.tasks).toHaveLength(3);
    });

    it('事务失败时应该回滚', async () => {
      // Arrange
      const job = JobFixture.createDefault();
      // 模拟约束违反
      job.tasks = [null as any]; // 故意设置无效数据

      // Act & Assert
      await expect(repository.save(job)).rejects.toThrow();
      
      // 验证没有数据被保存
      const found = await repository.findById(job.id);
      expect(found).toBeNull();
    });
  });
});
```

### 3.2 测试数据映射

```typescript
describe('数据映射', () => {
  it('应该正确映射领域对象到数据库实体', async () => {
    // Arrange
    const job = Job.create({
      customerId: 'customer-123',
      tenantId: 'tenant-456'
    }).value;

    job.addTask(
      new Task('task-1', '开发任务', Money.of(1000)),
      2
    );

    // Act
    await repository.save(job);

    // Assert - 查询数据库验证映射
    const connection = testDb.getConnection();
    const dbJob = await connection
      .createQueryBuilder()
      .select('j.*')
      .from('jobs', 'j')
      .where('j.id = :id', { id: job.id })
      .getRawOne();

    expect(dbJob).toBeDefined();
    expect(dbJob.customer_id).toBe('customer-123');
    expect(dbJob.tenant_id).toBe('tenant-456');
    expect(dbJob.status).toBe('draft');
  });

  it('应该正确映射数据库实体到领域对象', async () => {
    // Arrange - 直接插入数据库
    const connection = testDb.getConnection();
    await connection
      .createQueryBuilder()
      .insert()
      .into('jobs')
      .values({
        id: 'job-123',
        customer_id: 'customer-456',
        tenant_id: 'tenant-789',
        status: 'submitted',
        budget: 1000,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Act
    const job = await repository.findById('job-123');

    // Assert
    expect(job).toBeInstanceOf(Job);
    expect(job?.customerId).toBe('customer-456');
    expect(job?.tenantId).toBe('tenant-789');
    expect(job?.status).toBe('submitted');
  });
});
```

---

## 四、消息队列集成测试

### 4.1 Kafka 测试容器

```typescript
// test-helpers/kafka-container.ts
import { Kafka, KafkaContainer as BaseKafkaContainer } from '@testcontainers/kafka';

export class TestKafka {
  private container: BaseKafkaContainer;
  private kafka: Kafka;

  static async create(): Promise<TestKafka> {
    const container = await new BaseKafkaContainer()
      .withExposedPorts(9093)
      .start();

    const testKafka = new TestKafka();
    testKafka.container = container;
    
    const broker = `${container.getHost()}:${container.getMappedPort(9093)}`;
    testKafka.kafka = new Kafka({
      brokers: [broker],
      clientId: 'test-client'
    });

    return testKafka;
  }

  getBroker(): string {
    return `${this.container.getHost()}:${this.container.getMappedPort(9093)}`;
  }

  async createTopic(topic: string): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic, numPartitions: 1 }]
    });
    await admin.disconnect();
  }

  async consumeMessages(topic: string, timeout: number = 5000): Promise<any[]> {
    const consumer = this.kafka.consumer({ groupId: 'test-group' });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    const messages: any[] = [];
    
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        consumer.disconnect();
        resolve(messages);
      }, timeout);

      consumer.run({
        eachMessage: async ({ message }) => {
          messages.push(JSON.parse(message.value?.toString() || '{}'));
          if (messages.length > 0) {
            clearTimeout(timeoutId);
            await consumer.disconnect();
            resolve(messages);
          }
        }
      });
    });
  }

  async close(): Promise<void> {
    await this.container.stop();
  }
}
```

### 4.2 测试事件发布

```typescript
// kafka-event-bus.int-spec.ts
import { KafkaEventBus } from './kafka-event-bus';
import { TestKafka } from '../../../../tests/helpers/kafka-container';

describe('KafkaEventBus', () => {
  let eventBus: KafkaEventBus;
  let testKafka: TestKafka;

  beforeAll(async () => {
    testKafka = await TestKafka.create();
    await testKafka.createTopic('domain-events');
    
    eventBus = new KafkaEventBus({
      brokers: [testKafka.getBroker()],
      topic: 'domain-events'
    });
  }, 60000);

  afterAll(async () => {
    await eventBus.disconnect();
    await testKafka.close();
  });

  describe('publish', () => {
    it('应该成功发布事件到Kafka', async () => {
      // Arrange
      const event = new JobCreatedEvent({
        jobId: 'job-123',
        customerId: 'customer-456',
        tenantId: 'tenant-789'
      });

      // Act
      await eventBus.publish(event);

      // Assert - 验证消息已被发布
      const messages = await testKafka.consumeMessages('domain-events');
      expect(messages).toHaveLength(1);
      expect(messages[0].eventName).toBe('JobCreated');
      expect(messages[0].aggregateId).toBe('job-123');
    });

    it('应该包含正确的元数据', async () => {
      // Arrange
      const event = new JobCreatedEvent(
        { jobId: 'job-123', customerId: 'customer-456' },
        { tenantId: 'tenant-789', userId: 'user-001', correlationId: 'corr-001' }
      );

      // Act
      await eventBus.publish(event);

      // Assert
      const messages = await testKafka.consumeMessages('domain-events');
      expect(messages[0].metadata.tenantId).toBe('tenant-789');
      expect(messages[0].metadata.userId).toBe('user-001');
      expect(messages[0].metadata.correlationId).toBe('corr-001');
    });

    it('应该批量发布多个事件', async () => {
      // Arrange
      const events = [
        new JobCreatedEvent({ jobId: 'job-1', customerId: 'customer-1' }),
        new JobCreatedEvent({ jobId: 'job-2', customerId: 'customer-2' }),
        new JobCreatedEvent({ jobId: 'job-3', customerId: 'customer-3' })
      ];

      // Act
      await eventBus.publish(events);

      // Assert
      const messages = await testKafka.consumeMessages('domain-events');
      expect(messages).toHaveLength(3);
    });
  });
});
```

---

## 五、外部API集成测试

### 5.1 使用 Mock Server

```typescript
// test-helpers/mock-server.ts
import { Server } from 'http';
import express from 'express';

export class MockExternalApi {
  private server: Server;
  private app: express.Application;
  private requests: any[] = [];

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.post('/api/payments', (req, res) => {
      this.requests.push({ method: 'POST', path: '/api/payments', body: req.body });

      if (req.body.amount > 10000) {
        res.status(400).json({ error: 'Amount exceeds limit' });
      } else {
        res.json({ transactionId: 'txn-123', status: 'success' });
      }
    });

    this.app.get('/api/payments/:id', (req, res) => {
      res.json({ transactionId: req.params.id, status: 'completed' });
    });
  }

  async start(port: number = 9999): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => resolve());
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  getRequests(): any[] {
    return this.requests;
  }

  clearRequests(): void {
    this.requests = [];
  }
}
```

### 5.2 测试外部API集成

```typescript
// payment-gateway.int-spec.ts
import { PaymentGateway } from './payment-gateway';
import { MockExternalApi } from '../../../../tests/helpers/mock-server';

describe('PaymentGateway', () => {
  let gateway: PaymentGateway;
  let mockApi: MockExternalApi;

  beforeAll(async () => {
    mockApi = new MockExternalApi();
    await mockApi.start(9999);

    gateway = new PaymentGateway({
      baseUrl: 'http://localhost:9999',
      apiKey: 'test-api-key'
    });
  });

  afterAll(async () => {
    await mockApi.stop();
  });

  beforeEach(() => {
    mockApi.clearRequests();
  });

  describe('processPayment', () => {
    it('应该成功处理支付', async () => {
      // Arrange
      const payment = {
        jobId: 'job-123',
        amount: 1000,
        currency: 'USD'
      };

      // Act
      const result = await gateway.processPayment(payment);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value.transactionId).toBe('txn-123');
      expect(result.value.status).toBe('success');

      // 验证请求
      const requests = mockApi.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].body).toEqual(payment);
    });

    it('金额超限时应该返回错误', async () => {
      // Arrange
      const payment = {
        jobId: 'job-123',
        amount: 15000, // 超过限制
        currency: 'USD'
      };

      // Act
      const result = await gateway.processPayment(payment);

      // Assert
      expect(result.isFail()).toBe(true);
      expect(result.value.message).toContain('Amount exceeds limit');
    });
  });

  describe('getPaymentStatus', () => {
    it('应该成功查询支付状态', async () => {
      // Act
      const result = await gateway.getPaymentStatus('txn-123');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value.status).toBe('completed');
    });
  });
});
```

---

## 六、集成测试最佳实践

### 6.1 测试隔离

```typescript
describe('JobRepository', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    // 所有测试共享一个容器
    testDb = await TestDatabase.create();
  });

  afterAll(async () => {
    // 测试结束后关闭容器
    await testDb.close();
  });

  beforeEach(async () => {
    // 每个测试前清空数据
    await testDb.cleanup();
  });

  it('测试1', async () => {
    // 数据库是干净的
  });

  it('测试2', async () => {
    // 数据库是干净的
  });
});
```

### 6.2 测试数据管理

```typescript
// 使用 Fixture 创建测试数据
describe('JobRepository', () => {
  it('应该查询客户的任务', async () => {
    // Arrange - 使用 Fixture 创建测试数据
    const customerId = 'customer-123';
    const jobs = [
      JobFixture.createDefault({ customerId }),
      JobFixture.createDefault({ customerId }),
      JobFixture.createDefault({ customerId: 'other' })
    ];

    for (const job of jobs) {
      await repository.save(job);
    }

    // Act
    const result = await repository.findByCustomerId(customerId);

    // Assert
    expect(result).toHaveLength(2);
  });
});
```

### 6.3 并发测试控制

```typescript
// 集成测试较慢，需要控制并发
describe('JobRepository', () => {
  // 使用 runInBand 串行执行测试
  // 或在 jest.config.js 中配置：
  // testRunner: 'jest-circus/runner',
  // maxConcurrency: 1

  it('测试1', async () => {
    // 测试代码
  }, 10000); // 增加超时时间
});
```

### 6.4 清理策略

```typescript
describe('JobRepository', () => {
  let testDb: TestDatabase;
  let repository: JobRepository;

  beforeAll(async () => {
    testDb = await TestDatabase.create();
    repository = new JobRepository(testDb.getConnection());
  });

  afterAll(async () => {
    await testDb.close();
  });

  // 方式1: 每个测试前清空
  beforeEach(async () => {
    await testDb.cleanup();
  });

  // 方式2: 每个测试后清空（不推荐，失败时可能影响后续测试）
  afterEach(async () => {
    await testDb.cleanup();
  });

  // 方式3: 测试内手动清空（推荐用于大型测试套件）
  it('测试1', async () => {
    try {
      // 测试代码
    } finally {
      await testDb.cleanup();
    }
  });
});
```

---

## 七、Jest 配置

### 7.1 集成测试配置

```javascript
// jest.config.js
module.exports = {
  // 集成测试使用单独的配置
  testMatch: ['**/*.int-spec.ts'],
  
  // 集成测试串行执行
  maxConcurrency: 1,
  
  // 增加超时时间
  testTimeout: 30000,
  
  // 测试前设置环境
  globalSetup: './tests/setup/integration-setup.ts',
  globalTeardown: './tests/setup/integration-teardown.ts',
  
  // 覆盖率配置
  collectCoverageFrom: [
    'src/infrastructure/**/*.ts',
    '!src/infrastructure/**/*.int-spec.ts'
  ]
};
```

### 7.2 全局设置

```typescript
// tests/setup/integration-setup.ts
export default async function globalSetup() {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://...';
  
  // 可以在这里启动全局容器
  // global.__TEST_DB__ = await TestDatabase.create();
}

// tests/setup/integration-teardown.ts
export default async function globalTeardown() {
  // 清理全局容器
  // if (global.__TEST_DB__) {
  //   await global.__TEST_DB__.close();
  // }
}
```

### 7.3 运行集成测试

```bash
# 运行所有集成测试
pnpm run test:integration

# 运行特定文件的集成测试
pnpm run test:integration job.repository.int-spec.ts

# 带覆盖率的集成测试
pnpm run test:integration --coverage
```

---

[下一章：端到端测试 →](./09-e2e-testing.md)
