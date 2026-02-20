# 端到端测试

[返回目录](./README.md) | [上一章：集成测试](./08-integration-testing.md)

---

## 一、端到端测试定义

### 1.1 什么是端到端测试？

端到端测试（End-to-End Testing）验证**完整的业务流程**，从用户界面到数据库，确保整个系统按预期工作。

### 1.2 E2E 测试特点

| 特点 | 说明 |
|:---|:---|
| **真实性** | 使用真实的数据库、消息队列等基础设施 |
| **完整性** | 覆盖完整的用户场景和业务流程 |
| **慢速** | 执行时间较长（分钟级） |
| **数量少** | 只测试关键业务场景（10%） |
| **脆弱性** | 容易受到外部环境影响 |

### 1.3 E2E 测试范围

```
┌────────────────────────────────────────────────┐
│                 客户端（Web/Mobile）             │
└────────────────────────────────────────────────┘
                     ↓ HTTP API
┌────────────────────────────────────────────────┐
│              API 层（Controller）               │
└────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────┐
│              应用层（Use Case）                 │
└────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────┐
│              领域层（Domain）                   │
└────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────┐
│         基础设施层（Repository、EventBus）        │
└────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────┐
│       数据库（PostgreSQL、Kafka、Redis）          │
└────────────────────────────────────────────────┘
```

---

## 二、API 端到端测试

### 2.1 测试环境准备

```typescript
// test-helpers/e2e-test-app.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TestDatabase } from './test-database';

export class E2ETestApp {
  private app: INestApplication;
  private testDb: TestDatabase;

  /**
   * 创建 E2E 测试应用
   */
  static async create(): Promise<E2ETestApp> {
    const e2eApp = new E2ETestApp();

    // 启动测试数据库
    e2eApp.testDb = await TestDatabase.create();

    // 创建 Nest 应用
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider('DATABASE_CONNECTION')
      .useValue(e2eApp.testDb.getConnection())
      .compile();

    e2eApp.app = moduleFixture.createNestApplication();

    // 配置全局管道
    e2eApp.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );

    await e2eApp.app.init();
    return e2eApp;
  }

  /**
   * 获取 HTTP 测试客户端
   */
  getHttpServer() {
    return this.app.getHttpServer();
  }

  /**
   * 清空测试数据
   */
  async cleanup(): Promise<void> {
    await this.testDb.cleanup();
  }

  /**
   * 关闭应用
   */
  async close(): Promise<void> {
    await this.app.close();
    await this.testDb.close();
  }
}
```

### 2.2 测试任务创建流程

```typescript
// job-flow.e2e-spec.ts
import * as request from 'supertest';
import { E2ETestApp } from '../test-helpers/e2e-test-app';
import { TestDatabase } from '../test-helpers/test-database';

describe('任务流程 E2E 测试', () => {
  let app: E2ETestApp;
  let httpServer: any;

  beforeAll(async () => {
    app = await E2ETestApp.create();
    httpServer = app.getHttpServer();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanup();
  });

  describe('创建任务', () => {
    it('应该成功创建任务', async () => {
      // Arrange
      const createJobDto = {
        customerId: 'customer-123',
        tenantId: 'tenant-456',
        tasks: [
          { taskId: 'task-1', name: '开发任务', budget: 2000 },
          { taskId: 'task-2', name: '测试任务', budget: 1000 }
        ]
      };

      // Act
      const response = await request(httpServer)
        .post('/api/jobs')
        .send(createJobDto)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        customerId: 'customer-123',
        status: 'draft',
        tasks: expect.arrayContaining([
          expect.objectContaining({
            taskId: 'task-1',
            name: '开发任务'
          })
        ])
      });
    });

    it('缺少必要字段时应该返回400', async () => {
      // Arrange
      const invalidDto = {
        customerId: 'customer-123'
        // 缺少 tenantId
      };

      // Act
      const response = await request(httpServer)
        .post('/api/jobs')
        .send(invalidDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('tenantId');
    });
  });

  describe('查询任务', () => {
    it('应该成功查询任务', async () => {
      // Arrange - 先创建任务
      const createResponse = await request(httpServer)
        .post('/api/jobs')
        .send({
          customerId: 'customer-123',
          tenantId: 'tenant-456',
          tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
        });

      const jobId = createResponse.body.id;

      // Act
      const response = await request(httpServer)
        .get(`/api/jobs/${jobId}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: jobId,
        customerId: 'customer-123'
      });
    });

    it('任务不存在时应该返回404', async () => {
      // Act
      const response = await request(httpServer)
        .get('/api/jobs/non-existent')
        .expect(404);

      // Assert
      expect(response.body.message).toContain('未找到任务');
    });
  });

  describe('提交任务', () => {
    it('应该成功提交任务', async () => {
      // Arrange - 创建任务
      const createResponse = await request(httpServer)
        .post('/api/jobs')
        .send({
          customerId: 'customer-123',
          tenantId: 'tenant-456',
          tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
        });

      const jobId = createResponse.body.id;

      // Act
      const response = await request(httpServer)
        .post(`/api/jobs/${jobId}/submit`)
        .expect(200);

      // Assert
      expect(response.body.status).toBe('submitted');
      expect(response.body.submittedAt).toBeDefined();
    });

    it('提交空任务时应该返回400', async () => {
      // Arrange - 创建空任务
      const createResponse = await request(httpServer)
        .post('/api/jobs')
        .send({
          customerId: 'customer-123',
          tenantId: 'tenant-456',
          tasks: []
        });

      const jobId = createResponse.body.id;

      // Act
      const response = await request(httpServer)
        .post(`/api/jobs/${jobId}/submit`)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('不能提交空任务');
    });
  });
});
```

### 2.3 测试完整业务流程

```typescript
describe('完整任务流程', () => {
  let app: E2ETestApp;
  let httpServer: any;
  let authToken: string;

  beforeAll(async () => {
    app = await E2ETestApp.create();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanup();
    
    // 登录获取 token
    const loginResponse = await request(httpServer)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.accessToken;
  });

  it('应该完成完整的任务流程', async () => {
    // ==================== Step 1: 创建客户 ====================
    const customerResponse = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '张三',
        email: 'zhangsan@example.com',
        tenantId: 'tenant-456'
      })
      .expect(201);

    const customerId = customerResponse.body.id;

    // ==================== Step 2: 创建任务模板 ====================
    const taskTemplate1 = await request(httpServer)
      .post('/api/task-templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '开发任务',
        defaultBudget: 2000,
        tenantId: 'tenant-456'
      })
      .expect(201);

    const taskTemplate2 = await request(httpServer)
      .post('/api/task-templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '测试任务',
        defaultBudget: 1000,
        tenantId: 'tenant-456'
      })
      .expect(201);

    // ==================== Step 3: 创建任务 ====================
    const jobResponse = await request(httpServer)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        tenantId: 'tenant-456',
        tasks: [
          { taskId: taskTemplate1.body.id, name: '开发任务', budget: 2000 },
          { taskId: taskTemplate2.body.id, name: '测试任务', budget: 1000 }
        ]
      })
      .expect(201);

    const jobId = jobResponse.body.id;
    expect(jobResponse.body.totalBudget).toBe(3000);

    // ==================== Step 4: 提交任务 ====================
    const submitResponse = await request(httpServer)
      .post(`/api/jobs/${jobId}/submit`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(submitResponse.body.status).toBe('submitted');

    // ==================== Step 5: 验证客户预算已分配 ====================
    const customerCheck = await request(httpServer)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(customerCheck.body.allocatedBudget).toBe(3000);

    // ==================== Step 6: 支付任务 ====================
    const paymentResponse = await request(httpServer)
      .post(`/api/jobs/${jobId}/pay`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentMethod: 'credit_card',
        amount: 3000
      })
      .expect(200);

    expect(paymentResponse.body.status).toBe('paid');

    // ==================== Step 7: 验证最终状态 ====================
    const finalJobResponse = await request(httpServer)
      .get(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(finalJobResponse.body.status).toBe('paid');
    expect(finalJobResponse.body.paidAt).toBeDefined();
  });
});
```

---

## 三、认证与授权测试

### 3.1 测试认证流程

```typescript
describe('认证流程', () => {
  let app: E2ETestApp;
  let httpServer: any;

  beforeAll(async () => {
    app = await E2ETestApp.create();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('用户注册', () => {
    it('应该成功注册新用户', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: '新用户',
        tenantId: 'tenant-456'
      };

      // Act
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send(registerDto)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: 'newuser@example.com',
        name: '新用户'
      });
    });

    it('邮箱已存在时应该返回409', async () => {
      // Arrange - 先注册一次
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          name: '用户1',
          tenantId: 'tenant-456'
        });

      // Act - 再次注册相同邮箱
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'AnotherPass123!',
          name: '用户2',
          tenantId: 'tenant-456'
        })
        .expect(409);

      // Assert
      expect(response.body.message).toContain('邮箱已被使用');
    });
  });

  describe('用户登录', () => {
    it('应该成功登录并返回token', async () => {
      // Arrange - 先注册用户
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!',
          name: '登录用户',
          tenantId: 'tenant-456'
        });

      // Act
      const response = await request(httpServer)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number)
      });
    });

    it('密码错误时应该返回401', async () => {
      // Arrange
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'wrongpass@example.com',
          password: 'CorrectPass123!',
          name: '用户',
          tenantId: 'tenant-456'
        });

      // Act
      const response = await request(httpServer)
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPass123!'
        })
        .expect(401);

      // Assert
      expect(response.body.message).toContain('邮箱或密码错误');
    });
  });

  describe('访问受保护资源', () => {
    it('携带有效token应该能访问', async () => {
      // Arrange - 注册并登录
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'protected@example.com',
          password: 'SecurePass123!',
          name: '用户',
          tenantId: 'tenant-456'
        });

      const loginResponse = await request(httpServer)
        .post('/api/auth/login')
        .send({
          email: 'protected@example.com',
          password: 'SecurePass123!'
        });

      const token = loginResponse.body.accessToken;

      // Act
      const response = await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.email).toBe('protected@example.com');
    });

    it('无token时应该返回401', async () => {
      // Act
      const response = await request(httpServer)
        .get('/api/users/profile')
        .expect(401);

      // Assert
      expect(response.body.message).toContain('未授权');
    });

    it('token过期时应该返回401', async () => {
      // Act
      const response = await request(httpServer)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      // Assert
      expect(response.body.message).toContain('token无效');
    });
  });
});
```

### 3.2 测试权限控制

```typescript
describe('权限控制', () => {
  let adminToken: string;
  let userToken: string;
  let httpServer: any;

  beforeAll(async () => {
    const app = await E2ETestApp.create();
    httpServer = app.getHttpServer();

    // 创建管理员用户
    adminToken = await createTestUser(app, 'admin@example.com', 'ADMIN');
    
    // 创建普通用户
    userToken = await createTestUser(app, 'user@example.com', 'USER');
  });

  describe('任务管理权限', () => {
    it('管理员应该能删除任务', async () => {
      // Arrange - 创建任务
      const jobResponse = await request(httpServer)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          customerId: 'customer-123',
          tenantId: 'tenant-456',
          tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
        });

      const jobId = jobResponse.body.id;

      // Act
      await request(httpServer)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('普通用户不能删除任务', async () => {
      // Arrange - 创建任务
      const jobResponse = await request(httpServer)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          customerId: 'customer-123',
          tenantId: 'tenant-456',
          tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
        });

      const jobId = jobResponse.body.id;

      // Act
      const response = await request(httpServer)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Assert
      expect(response.body.message).toContain('权限不足');
    });
  });
});
```

---

## 四、多租户测试

### 4.1 测试租户隔离

```typescript
describe('多租户隔离', () => {
  let app: E2ETestApp;
  let httpServer: any;
  let tenant1Token: string;
  let tenant2Token: string;

  beforeAll(async () => {
    app = await E2ETestApp.create();
    httpServer = app.getHttpServer();

    // 创建租户1的用户
    tenant1Token = await createTestUser(app, 'tenant1@example.com', 'USER', 'tenant-1');
    
    // 创建租户2的用户
    tenant2Token = await createTestUser(app, 'tenant2@example.com', 'USER', 'tenant-2');
  });

  it('租户1不能访问租户2的数据', async () => {
    // Arrange - 租户2创建任务
    const jobResponse = await request(httpServer)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({
        customerId: 'customer-123',
        tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
      });

    const tenant2JobId = jobResponse.body.id;

    // Act - 租户1尝试访问
    const response = await request(httpServer)
      .get(`/api/jobs/${tenant2JobId}`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect(404);

    // Assert
    expect(response.body.message).toContain('未找到任务');
  });

  it('租户1和租户2的数据应该完全隔离', async () => {
    // Arrange - 两个租户各创建任务
    await request(httpServer)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({
        customerId: 'customer-1',
        tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
      });

    await request(httpServer)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({
        customerId: 'customer-2',
        tasks: [{ taskId: 'task-2', name: '测试任务', budget: 1000 }]
      });

    // Act - 查询各自租户的任务列表
    const tenant1Jobs = await request(httpServer)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect(200);

    const tenant2Jobs = await request(httpServer)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .expect(200);

    // Assert - 每个租户只能看到自己的任务
    expect(tenant1Jobs.body.items).toHaveLength(1);
    expect(tenant1Jobs.body.items[0].customerId).toBe('customer-1');

    expect(tenant2Jobs.body.items).toHaveLength(1);
    expect(tenant2Jobs.body.items[0].customerId).toBe('customer-2');
  });
});
```

---

## 五、并发与性能测试

### 5.1 测试并发场景

```typescript
describe('并发测试', () => {
  let app: E2ETestApp;
  let httpServer: any;
  let authToken: string;

  beforeAll(async () => {
    app = await E2ETestApp.create();
    httpServer = app.getHttpServer();
    authToken = await getAuthToken(app);
  });

  it('应该正确处理并发任务创建', async () => {
    // Arrange
    const concurrentRequests = 10;
    const requests = [];

    // Act - 并发创建任务
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request(httpServer)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId: `customer-${i}`,
            tenantId: 'tenant-456',
            tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
          })
      );
    }

    const responses = await Promise.all(requests);

    // Assert - 所有请求都应该成功
    const successCount = responses.filter(r => r.status === 201).length;
    expect(successCount).toBe(concurrentRequests);

    // 验证数据库中的任务数量
    const jobsList = await request(httpServer)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(jobsList.body.total).toBe(concurrentRequests);
  });

  it('应该正确处理预算并发分配', async () => {
    // Arrange - 创建预算为10000的客户
    const customerResponse = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '测试客户',
        totalBudget: 10000,
        tenantId: 'tenant-456'
      });

    const customerId = customerResponse.body.id;

    // Act - 10个并发请求，每个预算2000
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        request(httpServer)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId,
            tenantId: 'tenant-456',
            tasks: [{ taskId: `task-${i}`, name: `任务${i}`, budget: 2000 }]
          })
      );
    }

    const responses = await Promise.all(requests);

    // Assert - 只有前5个应该成功（10000 / 2000 = 5）
    const successCount = responses.filter(r => r.status === 201).length;
    expect(successCount).toBe(5);

    // 验证客户剩余预算
    const customerCheck = await request(httpServer)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(customerCheck.body.remainingBudget).toBe(0);
  });
});
```

---

## 六、测试数据管理

### 6.1 使用测试夹具

```typescript
// job-flow.fixture.ts
export class JobFlowFixture {
  /**
   * 创建完整的测试数据集
   */
  static async setupTestData(app: E2ETestApp): Promise<TestDataSet> {
    const httpServer = app.getHttpServer();
    const authToken = await getAuthToken(app);

    // 创建客户
    const customerResponse = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '测试客户',
        email: 'test-customer@example.com',
        tenantId: 'tenant-456'
      });

    // 创建任务模板
    const taskTemplateResponse = await request(httpServer)
      .post('/api/task-templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '测试任务模板',
        defaultBudget: 2000,
        tenantId: 'tenant-456'
      });

    return {
      authToken,
      customerId: customerResponse.body.id,
      taskTemplateId: taskTemplateResponse.body.id
    };
  }
}

// 使用
describe('任务流程', () => {
  let app: E2ETestApp;
  let testData: TestDataSet;

  beforeAll(async () => {
    app = await E2ETestApp.create();
    testData = await JobFlowFixture.setupTestData(app);
  });

  it('应该创建任务', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${testData.authToken}`)
      .send({
        customerId: testData.customerId,
        tenantId: 'tenant-456',
        tasks: [{ taskId: testData.taskTemplateId, name: '开发任务', budget: 2000 }]
      })
      .expect(201);
  });
});
```

### 6.2 测试数据清理

```typescript
describe('任务流程', () => {
  let app: E2ETestApp;

  beforeEach(async () => {
    // 清空数据库
    await app.cleanup();
  });

  afterEach(async () => {
    // 再次清理，防止测试失败影响其他测试
    await app.cleanup();
  });

  it('测试1', async () => {
    // 数据库是干净的
  });

  it('测试2', async () => {
    // 数据库是干净的
  });
});
```

---

## 七、E2E 测试最佳实践

### 7.1 选择关键场景

```typescript
// ✅ 正确 - 测试关键业务流程
describe('任务流程', () => {
  it('应该完成完整的任务流程', async () => {
    // 创建任务 → 添加任务项 → 提交 → 支付 → 完成
  });
});

// ❌ 错误 - 测试太多细节
describe('任务字段验证', () => {
  it('customerId 不能为空', async () => {});
  it('budget 必须大于0', async () => {});
  // 这些应该用单元测试
});
```

### 7.2 独立性原则

```typescript
// ✅ 正确 - 每个测试独立
it('应该创建任务', async () => {
  await app.cleanup(); // 清空数据
  
  const response = await request(httpServer)
    .post('/api/jobs')
    .send(jobData)
    .expect(201);
});

// ❌ 错误 - 测试依赖顺序
it('测试1', async () => {
  // 创建数据
});

it('测试2', async () => {
  // 依赖测试1创建的数据 - 危险！
});
```

### 7.3 幂等性

```typescript
// ✅ 正确 - 测试可以重复运行
describe('任务流程', () => {
  it('应该创建任务', async () => {
    const jobId = `job-${Date.now()}`; // 使用唯一ID
    
    const response = await request(httpServer)
      .post('/api/jobs')
      .send({ id: jobId, ...otherData })
      .expect(201);
  });
});
```

---

## 八、Jest 配置

### 8.1 E2E 测试配置

```javascript
// jest-e2e.config.js
module.exports = {
  testMatch: ['**/*.e2e-spec.ts'],
  
  // E2E 测试串行执行
  maxConcurrency: 1,
  
  // 增加超时时间
  testTimeout: 60000,
  
  // 全局设置
  globalSetup: './tests/setup/e2e-setup.ts',
  globalTeardown: './tests/setup/e2e-teardown.ts',
  
  // 不收集覆盖率（E2E 测试很慢）
  collectCoverage: false
};
```

### 8.2 运行 E2E 测试

```bash
# 运行所有 E2E 测试
pnpm run test:e2e

# 运行特定文件
pnpm run test:e2e job-flow.e2e-spec.ts

# 带详细输出
pnpm run test:e2e --verbose
```

---

[下一章：CI/CD集成 →](./10-ci-cd-integration.md)
